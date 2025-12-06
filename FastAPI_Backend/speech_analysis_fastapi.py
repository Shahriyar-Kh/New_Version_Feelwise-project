# speech_analysis_fastapi.py - UPDATED FOR MAXIMUM ACCURACY
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['NO_TF'] = '1'
os.environ["PATH"] += os.pathsep + r"C:\ffmpeg\bin"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import time
import base64
import uuid
import wave
import subprocess
import warnings
import logging
import numpy as np
from typing import Tuple, Dict, List
from dataclasses import dataclass
from collections import Counter

import torch
import torch.nn.functional as F
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

warnings.filterwarnings("ignore")

# ========== CONFIGURATION ==========
# USING THE MOST ACCURATE MODEL AVAILABLE
MODEL_NAME = "audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim"
# Alternative high-accuracy models (uncomment if needed):
# MODEL_NAME = "m3hrdadfi/wav2vec2-base-100k-gtzan-music-genres"
# MODEL_NAME = "ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition"

# Confidence thresholds
HIGH_CONFIDENCE_THRESHOLD = 0.6
MIN_CONFIDENCE_THRESHOLD = 0.4
MIN_AUDIO_LENGTH_SECONDS = 2.0
MIN_AUDIO_SIZE_KB = 3

# ========== LOGGING ==========
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("speech_analysis.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("speech-emotion-api")

# ========== AUDIO PREPROCESSING IMPORTS ==========
try:
    import librosa
    from scipy import signal
    from scipy.io import wavfile
    import soundfile as sf
    AUDIO_PROCESSING_AVAILABLE = True
    logger.info("Audio processing libraries loaded successfully")
except ImportError as e:
    logger.warning(f"Audio processing libraries not available: {e}")
    AUDIO_PROCESSING_AVAILABLE = False

# ========== MODEL LOADING ==========
try:
    from transformers import (
        AutoFeatureExtractor,
        AutoModelForAudioClassification,
        Wav2Vec2FeatureExtractor
    )
    TRANSFORMERS_AVAILABLE = True
    logger.info("Transformers imported successfully")
except Exception as e:
    logger.error(f"Failed to import transformers: {e}")
    TRANSFORMERS_AVAILABLE = False

# ========== FASTAPI APP ==========
app = FastAPI(
    title="Speech Emotion Analysis API",
    description="High-accuracy speech emotion detection using state-of-the-art models",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== DATA MODELS ==========
@dataclass
class EmotionPrediction:
    label: str
    confidence: float
    standardized_label: str
    is_confident: bool

class SpeechInput(BaseModel):
    transcript: str = ""
    audio: str = ""  # Base64 encoded audio

class AnalysisResponse(BaseModel):
    status: str
    emotion: str
    raw_label: str
    confidence: float
    probabilities: Dict[str, float]
    top_emotions: List[List]
    recommendation: str
    daily_challenge: str
    daily_tip: str
    analysis_time_ms: float

# ========== MODEL INITIALIZATION ==========
feature_extractor = None
model = None
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def load_emotion_model():
    """Load the best available emotion recognition model"""
    global feature_extractor, model
    
    if not TRANSFORMERS_AVAILABLE:
        logger.error("Transformers not available")
        return False
    
    try:
        logger.info(f"Loading model: {MODEL_NAME}")
        logger.info(f"Using device: {device}")
        
        # Load with specific configuration for emotion recognition
        feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(
            MODEL_NAME,
            return_attention_mask=True,
            padding=True,
            sampling_rate=16000,
            do_normalize=True
        )
        
        model = AutoModelForAudioClassification.from_pretrained(MODEL_NAME)
        model.to(device)
        model.eval()
        
        # Print model info
        logger.info(f"Model loaded successfully")
        logger.info(f"Model type: {type(model).__name__}")
        logger.info(f"Model has {sum(p.numel() for p in model.parameters()):,} parameters")
        
        # Log emotion labels
        if hasattr(model.config, "id2label"):
            logger.info("Available emotion labels:")
            for idx, label in model.config.id2label.items():
                logger.info(f"  {idx}: {label}")
        
        return True
        
    except Exception as e:
        logger.exception(f"Error loading model: {e}")
        feature_extractor = None
        model = None
        return False

# Load model on startup
if TRANSFORMERS_AVAILABLE:
    load_emotion_model()

# ========== AUDIO PROCESSING FUNCTIONS ==========
def check_ffmpeg() -> bool:
    """Check if ffmpeg is available"""
    try:
        result = subprocess.run(
            ["ffmpeg", "-version"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=5
        )
        return result.returncode == 0
    except Exception as e:
        logger.warning(f"FFmpeg check failed: {e}")
        return False

def strip_data_url_prefix(b64_data: str) -> str:
    """Remove data URL prefix from base64 string"""
    if b64_data.startswith("data:audio"):
        parts = b64_data.split(",", 1)
        return parts[1] if len(parts) == 2 else b64_data
    return b64_data

def convert_to_wav(audio_data: bytes, output_path: str) -> bool:
    """Convert audio bytes to WAV format using ffmpeg"""
    try:
        # Save raw audio data
        temp_input = f"temp_input_{uuid.uuid4()}.webm"
        with open(temp_input, "wb") as f:
            f.write(audio_data)
        
        # Convert to WAV with optimal settings for speech
        cmd = [
            "ffmpeg", "-hide_banner", "-loglevel", "error",
            "-y", "-i", temp_input, "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",          # 16kHz sample rate
            "-ac", "1",              # Mono
            "-af", "highpass=f=80,lowpass=f=8000,volume=2.0,dynaudnorm",  # Audio filters
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, timeout=30)
        
        # Cleanup
        if os.path.exists(temp_input):
            os.remove(temp_input)
        
        if result.returncode != 0:
            logger.error(f"FFmpeg conversion failed: {result.stderr.decode()}")
            return False
            
        return os.path.exists(output_path) and os.path.getsize(output_path) > 1000
        
    except Exception as e:
        logger.exception(f"Audio conversion error: {e}")
        return False

def enhance_audio_quality(audio: np.ndarray, sr: int) -> np.ndarray:
    """Apply audio enhancement for better emotion detection"""
    if not AUDIO_PROCESSING_AVAILABLE:
        return audio
    
    try:
        # Remove DC offset
        audio = audio - np.mean(audio)
        
        # Apply bandpass filter for speech frequencies (80Hz - 8kHz)
        nyquist = sr / 2
        low = 80 / nyquist
        high = 8000 / nyquist
        b, a = signal.butter(4, [low, high], btype='band')
        audio = signal.filtfilt(b, a, audio)
        
        # Normalize volume
        max_val = np.max(np.abs(audio))
        if max_val > 0:
            audio = audio / max_val
        
        # Apply noise reduction (spectral gating)
        if len(audio) > sr:  # At least 1 second
            try:
                # Simple noise reduction
                audio = librosa.effects.preemphasis(audio)
                audio = librosa.effects.trim(audio, top_db=20)[0]
            except:
                pass
        
        return audio
        
    except Exception as e:
        logger.warning(f"Audio enhancement failed: {e}")
        return audio

def extract_audio_features(audio: np.ndarray, sr: int) -> Dict:
    """Extract audio features for additional validation"""
    features = {}
    
    try:
        # Basic features
        features['duration'] = len(audio) / sr
        features['energy'] = np.mean(audio**2)
        features['zero_crossing_rate'] = np.mean(librosa.feature.zero_crossing_rate(audio))
        
        # Pitch features (if audio is long enough)
        if len(audio) > sr * 0.5:
            pitches, magnitudes = librosa.piptrack(y=audio, sr=sr)
            features['pitch_mean'] = np.mean(pitches[pitches > 0])
        
        # Spectral features
        spectral_centroid = librosa.feature.spectral_centroid(y=audio, sr=sr)
        features['spectral_centroid_mean'] = np.mean(spectral_centroid)
        
    except Exception as e:
        logger.debug(f"Feature extraction failed: {e}")
    
    return features

# ========== EMOTION MAPPING ==========
EMOTION_MAPPING = {
    # Anger group
    "angry": "anger",
    "anger": "anger",
    "furious": "anger",
    "irritated": "anger",
    "annoyed": "anger",
    "mad": "anger",
    "frustrated": "anger",
    "outraged": "anger",
    
    # Happiness group
    "happy": "joy",
    "happiness": "joy",
    "joy": "joy",
    "joyful": "joy",
    "excited": "joy",
    "delighted": "joy",
    "pleased": "joy",
    "content": "joy",
    "cheerful": "joy",
    "blissful": "joy",
    "elated": "joy",
    
    # Sadness group
    "sad": "sadness",
    "sadness": "sadness",
    "depressed": "sadness",
    "upset": "sadness",
    "unhappy": "sadness",
    "gloomy": "sadness",
    "melancholy": "sadness",
    "sorrowful": "sadness",
    "heartbroken": "sadness",
    
    # Fear group
    "fear": "fear",
    "afraid": "fear",
    "scared": "fear",
    "fearful": "fear",
    "anxious": "fear",
    "nervous": "fear",
    "terrified": "fear",
    "worried": "fear",
    "panicked": "fear",
    
    # Surprise group
    "surprise": "surprise",
    "surprised": "surprise",
    "shocked": "surprise",
    "amazed": "surprise",
    "astonished": "surprise",
    "startled": "surprise",
    
    # Neutral group
    "neutral": "neutral",
    "calm": "neutral",
    "bored": "neutral",
    "tired": "neutral",
    "relaxed": "neutral",
    "peaceful": "neutral",
    
    # Disgust group
    "disgust": "disgust",
    "disgusted": "disgust",
    "repulsed": "disgust",
    "revolted": "disgust",
    
    # Love group
    "love": "love",
    "affectionate": "love",
    "caring": "love",
    "fond": "love",
    "adoring": "love",
    "passionate": "love",
}

EMOTION_GROUPS = {
    "positive": ["joy", "love", "surprise"],
    "negative": ["anger", "sadness", "fear", "disgust"],
    "neutral": ["neutral"]
}

def standardize_emotion(label: str, confidence: float = 1.0) -> str:
    """Convert model output to standardized emotion with confidence check"""
    label_lower = label.lower()
    
    # Direct mapping
    if label_lower in EMOTION_MAPPING:
        return EMOTION_MAPPING[label_lower]
    
    # Partial matching
    for key, value in EMOTION_MAPPING.items():
        if key in label_lower:
            return value
    
    # Check for intensity words
    intensity_words = ["very", "extremely", "really", "super", "incredibly"]
    base_words = ["happy", "sad", "angry", "scared", "surprised"]
    
    for word in label_lower.split():
        if word in base_words:
            for base, mapped in EMOTION_MAPPING.items():
                if base in word:
                    return mapped
    
    # If low confidence, default to neutral
    if confidence < 0.5:
        return "neutral"
    
    # Fallback
    return "neutral"

def are_emotions_compatible(emotion1: str, emotion2: str) -> bool:
    """Check if two emotions can be combined"""
    if emotion1 == emotion2:
        return True
    
    # Check if they're in the same group
    for group in EMOTION_GROUPS.values():
        if emotion1 in group and emotion2 in group:
            return True
    
    # Special cases: surprise can be with positive or negative
    if "surprise" in [emotion1, emotion2]:
        return True
    
    return False

# ========== RECOMMENDATIONS ==========
RECOMMENDATIONS = {
    "anger": "Take deep breaths and count to ten before reacting. Try going for a walk to cool down.",
    "joy": "Share your happiness with others! Positive energy is contagious.",
    "sadness": "Talk to a friend or write in a journal. Remember, it's okay to feel sad sometimes.",
    "fear": "Practice grounding techniques: name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste.",
    "surprise": "Embrace the unexpected! Surprises can lead to new opportunities.",
    "neutral": "Practice mindfulness to stay present. Try a 5-minute breathing exercise.",
    "disgust": "Identify what's bothering you and see if you can address it directly.",
    "love": "Express your feelings to those you care about. A simple 'I appreciate you' goes a long way."
}

DAILY_CHALLENGES = {
    "anger": "Practice the 4-7-8 breathing technique: inhale for 4 seconds, hold for 7, exhale for 8.",
    "joy": "Share a compliment with 3 different people today.",
    "sadness": "Do one kind thing for yourself, like taking a relaxing bath or reading your favorite book.",
    "fear": "Face one small fear today. Start with something manageable.",
    "surprise": "Try something new or spontaneous that you wouldn't normally do.",
    "neutral": "Notice 3 moments of joy or beauty in your day and write them down.",
    "disgust": "Reframe one negative thought into a more positive or neutral perspective.",
    "love": "Reach out to someone you care about and tell them what they mean to you."
}

DAILY_TIPS = {
    "anger": "When angry, try progressive muscle relaxation: tense and then relax each muscle group.",
    "joy": "Keep a gratitude journal to remind yourself of positive moments.",
    "sadness": "Gentle exercise like walking can boost mood-regulating chemicals in your brain.",
    "fear": "Break down big challenges into smaller, manageable steps.",
    "surprise": "Stay curious and open-minded when unexpected things happen.",
    "neutral": "Practice mindful breathing for 2 minutes whenever you feel disconnected.",
    "disgust": "Explore the root cause of your discomfort - understanding it can reduce its power.",
    "love": "Small acts of kindness release oxytocin, the 'love hormone', benefiting both giver and receiver."
}

# ========== CORE ANALYSIS FUNCTION ==========
def analyze_emotion_from_audio(audio_base64: str) -> Tuple[EmotionPrediction, Dict, List]:
    """
    Main function to analyze emotion from audio
    Returns: (prediction, all_probabilities, top_predictions)
    """
    start_time = time.time()
    
    # Validate model is loaded
    if model is None or feature_extractor is None:
        logger.error("Model not loaded")
        return EmotionPrediction("neutral", 0.5, "neutral", False), {}, []
    
    # Validate ffmpeg
    if not check_ffmpeg():
        logger.error("FFmpeg not available")
        raise HTTPException(status_code=500, detail="Audio processing service unavailable")
    
    # Decode base64
    audio_base64 = strip_data_url_prefix(audio_base64)
    try:
        audio_bytes = base64.b64decode(audio_base64)
    except Exception as e:
        logger.exception("Base64 decode failed")
        raise HTTPException(status_code=400, detail=f"Invalid audio data: {e}")
    
    # Validate audio size
    if len(audio_bytes) < MIN_AUDIO_SIZE_KB * 1024:
        raise HTTPException(status_code=400, detail=f"Audio too short (minimum {MIN_AUDIO_SIZE_KB}KB)")
    
    # Convert to WAV
    temp_wav = f"temp_{uuid.uuid4()}.wav"
    if not convert_to_wav(audio_bytes, temp_wav):
        raise HTTPException(status_code=500, detail="Audio conversion failed")
    
    # Load and process audio
    try:
        if AUDIO_PROCESSING_AVAILABLE:
            # Use librosa for better loading
            audio, sr = librosa.load(temp_wav, sr=16000, mono=True)
            audio = enhance_audio_quality(audio, sr)
            
            # Validate audio length
            if len(audio) / sr < MIN_AUDIO_LENGTH_SECONDS:
                raise HTTPException(status_code=400, 
                                  detail=f"Audio too short (minimum {MIN_AUDIO_LENGTH_SECONDS} seconds)")
        else:
            # Fallback to wave
            with wave.open(temp_wav, 'rb') as wav_file:
                sr = wav_file.getframerate()
                n_frames = wav_file.getnframes()
                frames = wav_file.readframes(n_frames)
                audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
                
                if len(audio) / sr < MIN_AUDIO_LENGTH_SECONDS:
                    raise HTTPException(status_code=400,
                                      detail=f"Audio too short (minimum {MIN_AUDIO_LENGTH_SECONDS} seconds)")
        
        # Cleanup temp file
        if os.path.exists(temp_wav):
            os.remove(temp_wav)
        
        # Extract features for validation
        audio_features = extract_audio_features(audio, sr)
        
        # Check audio quality
        if audio_features.get('energy', 0) < 0.001:
            logger.warning("Audio has very low energy (might be silent)")
        
        # Prepare input for model
        inputs = feature_extractor(
            audio,
            sampling_rate=sr,
            return_tensors="pt",
            padding=True
        )
        
        # Move to device
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        # Run inference
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            probabilities = F.softmax(logits, dim=-1)[0]
        
        # Convert to dictionary
        id2label = getattr(model.config, "id2label", {})
        all_probabilities = {}
        
        for i in range(len(probabilities)):
            label = id2label.get(i, f"unknown_{i}")
            prob = float(probabilities[i])
            all_probabilities[label] = prob
        
        # Sort by probability
        sorted_probs = sorted(all_probabilities.items(), key=lambda x: x[1], reverse=True)
        
        # Get top predictions
        top_n = min(5, len(sorted_probs))
        top_predictions = sorted_probs[:top_n]
        
        # Log top predictions
        logger.info(f"Top {top_n} predictions:")
        for label, prob in top_predictions:
            logger.info(f"  {label}: {prob:.3f}")
        
        # Primary prediction
        primary_label = top_predictions[0][0]
        primary_prob = top_predictions[0][1]
        
        # Check confidence
        is_confident = primary_prob >= HIGH_CONFIDENCE_THRESHOLD
        
        # If not confident, check if top 2 are similar and can be combined
        if not is_confident and len(top_predictions) >= 2:
            second_label = top_predictions[1][0]
            second_prob = top_predictions[1][1]
            
            std_primary = standardize_emotion(primary_label, primary_prob)
            std_second = standardize_emotion(second_label, second_prob)
            
            # If similar and close in probability, combine
            if (are_emotions_compatible(std_primary, std_second) and 
                abs(primary_prob - second_prob) < 0.2):
                combined_prob = (primary_prob + second_prob) / 2
                if combined_prob >= MIN_CONFIDENCE_THRESHOLD:
                    # Use weighted average
                    if std_primary == std_second:
                        final_emotion = std_primary
                    else:
                        # Prefer positive emotions for ties
                        if std_primary in EMOTION_GROUPS["positive"]:
                            final_emotion = std_primary
                        elif std_second in EMOTION_GROUPS["positive"]:
                            final_emotion = std_second
                        else:
                            final_emotion = std_primary if primary_prob > second_prob else std_second
                    
                    logger.info(f"Combined {primary_label} and {second_label} -> {final_emotion}")
                    return EmotionPrediction(
                        label=primary_label,
                        confidence=combined_prob,
                        standardized_label=final_emotion,
                        is_confident=True
                    ), all_probabilities, top_predictions
        
        # Standardize emotion
        standardized = standardize_emotion(primary_label, primary_prob)
        
        # If still low confidence, mark as uncertain
        if primary_prob < MIN_CONFIDENCE_THRESHOLD:
            standardized = "neutral"
            is_confident = False
        
        analysis_time = (time.time() - start_time) * 1000
        logger.info(f"Analysis completed in {analysis_time:.1f}ms")
        logger.info(f"Final emotion: {standardized} (confidence: {primary_prob:.3f})")
        
        return EmotionPrediction(
            label=primary_label,
            confidence=primary_prob,
            standardized_label=standardized,
            is_confident=is_confident
        ), all_probabilities, top_predictions
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    finally:
        # Cleanup
        if os.path.exists(temp_wav):
            try:
                os.remove(temp_wav)
            except:
                pass

# ========== API ENDPOINTS ==========
@app.post("/analyze-speech", response_model=AnalysisResponse)
async def analyze_speech(input: SpeechInput, request: Request):
    """
    Analyze speech emotion from audio
    """
    start_time = time.time()
    request_id = request.headers.get("X-Request-Id", uuid.uuid4().hex[:8])
    
    logger.info(f"[{request_id}] Starting analysis")
    
    if not input.audio:
        raise HTTPException(status_code=400, detail="Audio data is required")
    
    try:
        # Analyze emotion
        prediction, all_probs, top_emotions = analyze_emotion_from_audio(input.audio)
        
        analysis_time_ms = (time.time() - start_time) * 1000
        
        # Prepare response
        response = {
            "status": "success",
            "emotion": prediction.standardized_label,
            "raw_label": prediction.label,
            "confidence": prediction.confidence,
            "probabilities": all_probs,
            "top_emotions": [[label, prob] for label, prob in top_emotions],
            "recommendation": RECOMMENDATIONS.get(prediction.standardized_label, 
                                                 "Take time to reflect on your emotions."),
            "daily_challenge": DAILY_CHALLENGES.get(prediction.standardized_label,
                                                   "Practice mindful breathing for 5 minutes."),
            "daily_tip": DAILY_TIPS.get(prediction.standardized_label,
                                       "Regular emotional check-ins can improve self-awareness."),
            "analysis_time_ms": round(analysis_time_ms, 1)
        }
        
        logger.info(f"[{request_id}] Analysis successful: {prediction.standardized_label} "
                   f"(confidence: {prediction.confidence:.3f})")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[{request_id}] Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy" if model is not None else "degraded",
        "model_loaded": model is not None,
        "feature_extractor_loaded": feature_extractor is not None,
        "device": str(device),
        "audio_processing_available": AUDIO_PROCESSING_AVAILABLE,
        "ffmpeg_available": check_ffmpeg(),
        "model_name": MODEL_NAME
    }

@app.get("/model-info")
async def model_info():
    """Get information about the loaded model"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    info = {
        "model_name": MODEL_NAME,
        "model_type": type(model).__name__,
        "num_parameters": sum(p.numel() for p in model.parameters()),
        "device": str(device),
        "available_labels": {}
    }
    
    if hasattr(model.config, "id2label"):
        info["available_labels"] = model.config.id2label
    
    return info

@app.post("/test-audio")
async def test_audio_file(file: bytes):
    """Test endpoint for direct audio file upload"""
    try:
        audio_base64 = base64.b64encode(file).decode('utf-8')
        
        prediction, all_probs, top_emotions = analyze_emotion_from_audio(audio_base64)
        
        return {
            "status": "success",
            "emotion": prediction.standardized_label,
            "confidence": prediction.confidence,
            "raw_label": prediction.label,
            "top_predictions": [[label, prob] for label, prob in top_emotions],
            "is_confident": prediction.is_confident
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========== STARTUP ==========
@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    logger.info("Starting Speech Emotion Analysis API")
    logger.info(f"Using model: {MODEL_NAME}")
    
    if not check_ffmpeg():
        logger.warning("FFmpeg not found in PATH. Audio conversion may fail.")
    
    if TRANSFORMERS_AVAILABLE:
        success = load_emotion_model()
        if success:
            logger.info("✅ Model loaded successfully")
        else:
            logger.error("❌ Model loading failed")
    else:
        logger.error("❌ Transformers library not available")

# ========== MAIN ==========
if __name__ == "__main__":
    import uvicorn
    
    # Print startup banner
    print("=" * 60)
    print("SPEECH EMOTION ANALYSIS API")
    print(f"Model: {MODEL_NAME}")
    print(f"Device: {device}")
    print("=" * 60)
    
    uvicorn.run(
        "speech_analysis_fastapi:app",
        host="0.0.0.0",
        port=5000,
        reload=True,
        log_level="info"
    )