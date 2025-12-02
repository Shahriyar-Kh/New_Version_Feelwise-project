# api.py
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
from typing import Tuple

import numpy as np
from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

warnings.filterwarnings("ignore")

# -------- Logging setup --------
logging.basicConfig(level=logging.DEBUG, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("speech-api")

# -------- Transformers / Torch --------
try:
    import torch
    from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
    TRANSFORMERS_AVAILABLE = True
    logger.info("Transformers imported successfully")
except Exception as e:
    logger.error(f"Failed to import transformers: {e}")
    TRANSFORMERS_AVAILABLE = False
    torch = None
    AutoFeatureExtractor = None
    AutoModelForAudioClassification = None

# -------- FastAPI --------
app = FastAPI(title="Speech Emotion Analysis")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for dev, tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------- Model load --------
MODEL_NAME = "ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition"
feature_extractor = None
model = None

if TRANSFORMERS_AVAILABLE:
    try:
        t0 = time.perf_counter()
        feature_extractor = AutoFeatureExtractor.from_pretrained(MODEL_NAME)
        model = AutoModelForAudioClassification.from_pretrained(MODEL_NAME)
        model.eval()
        dt = (time.perf_counter() - t0) * 1000
        logger.info(f"Model {MODEL_NAME} loaded in {dt:.1f}ms")

        # 🔍 Print out id2label mapping for debugging
        if hasattr(model.config, "id2label"):
            logger.info("Model id2label mapping:")
            for idx, label in model.config.id2label.items():
                logger.info(f"  {idx}: {label}")
        else:
            logger.warning("Model has no id2label attribute")
    except Exception as e:
        logger.exception(f"Error loading model: {e}")
        feature_extractor = None
        model = None

# -------- Schemas --------
class SpeechInput(BaseModel):
    transcript: str = ""
    audio: str = ""  # base64 string (may include data URL prefix)

# -------- Helpers --------
def check_ffmpeg() -> bool:
    try:
        r = subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return r.returncode == 0
    except Exception:
        return False

def strip_data_url_prefix(b64: str) -> str:
    if b64.startswith("data:"):
        parts = b64.split(",", 1)
        return parts[1] if len(parts) == 2 else b64
    return b64

def load_audio_with_wave(file_path: str) -> Tuple[np.ndarray, int]:
    with wave.open(file_path, 'rb') as wav_file:
        n_channels = wav_file.getnchannels()
        sample_width = wav_file.getsampwidth()
        frame_rate = wav_file.getframerate()
        n_frames = wav_file.getnframes()

        frames = wav_file.readframes(n_frames)
        dtype = {1: np.uint8, 2: np.int16, 4: np.int32}.get(sample_width)
        if dtype is None:
            raise ValueError(f"Unsupported sample width: {sample_width}")

        audio = np.frombuffer(frames, dtype=dtype)
        # Normalize to float32 -1..1
        if sample_width == 1:
            audio = audio.astype(np.float32) / 128.0 - 1.0
        elif sample_width == 2:
            audio = audio.astype(np.float32) / 32768.0
        elif sample_width == 4:
            audio = audio.astype(np.float32) / 2147483648.0

        if n_channels > 1:
            audio = audio.reshape(-1, n_channels).mean(axis=1)

        return audio, frame_rate

def standardize_emotion(label: str) -> str:
    mapping = {
        "angry": "anger",
        "anger": "anger",
        "disgust": "disgust",
        "fear": "fear",
        "fearful": "fear",
        "happy": "happiness",
        "happiness": "happiness",
        "neutral": "neutral",
        "sad": "sadness",
        "sadness": "sadness",
        "surprise": "surprise",
        "surprised": "surprise",
        "calm": "calm",
        "unknown": "neutral",
    }
    return mapping.get(label.lower(), "neutral")

def get_recommendation(emotion: str) -> str:
    return {
        "anger": "Try deep breathing exercises to calm down.",
        "disgust": "Reflect on what's bothering you.",
        "fear": "Practice grounding techniques to feel safe.",
        "happiness": "Share your positive energy with others!",
        "neutral": "Stay open to new experiences.",
        "sadness": "Reach out to a friend or loved one.",
        "surprise": "Embrace the unexpected and adapt positively.",
    }.get(emotion, "Take time to reflect.")

def get_daily_challenge(emotion: str) -> str:
    return {
        "anger": "Write down three things you're grateful for today.",
        "disgust": "Find one positive aspect in a difficult situation.",
        "fear": "Face one small fear today safely.",
        "happiness": "Compliment three people around you.",
        "neutral": "Try a new activity you haven't done before.",
        "sadness": "Do one kind thing for yourself today.",
        "surprise": "Step out of your comfort zone with something new.",
    }.get(emotion, "Reflect on your emotions.")

def get_daily_tip(emotion: str) -> str:
    return {
        "anger": "Count to 10 before responding to difficult situations.",
        "disgust": "Explore the root of what’s causing discomfort.",
        "fear": "Break challenges into small, manageable steps.",
        "happiness": "Savor and write down positive moments.",
        "neutral": "Practice mindfulness to stay present.",
        "sadness": "Gentle exercise or a walk outdoors can lift your mood.",
        "surprise": "Be open to new opportunities that come your way.",
    }.get(emotion, "Check in with yourself regularly.")

def analyze_audio(audio_base64: str):
    if model is None or feature_extractor is None:
        logger.warning("Model/feature_extractor not loaded; returning neutral")
        return "neutral", {}, []

    if not check_ffmpeg():
        logger.error("FFmpeg not installed or not in PATH")
        raise HTTPException(status_code=500, detail="FFmpeg not installed")

    uid = uuid.uuid4().hex
    temp_input = f"tmp_{uid}.webm"
    temp_output = f"tmp_{uid}.wav"

    # decode base64
    audio_base64 = strip_data_url_prefix(audio_base64)
    try:
        raw = base64.b64decode(audio_base64)
    except Exception as e:
        logger.exception("Base64 decode failed")
        raise HTTPException(status_code=400, detail=f"Invalid base64: {e}")

    if len(raw) < 1000:
        raise HTTPException(status_code=400, detail="Audio too short (<1KB decoded)")

    with open(temp_input, "wb") as f:
        f.write(raw)

    # convert to WAV (16kHz mono)
    cmd = [
        "ffmpeg", "-hide_banner", "-loglevel", "error",
        "-y", "-i", temp_input, "-vn",
        "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
        temp_output
    ]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=45)
    if proc.returncode != 0 or not os.path.exists(temp_output):
        raise HTTPException(status_code=500, detail="FFmpeg conversion failed")

    # read wav
    audio, sr = load_audio_with_wave(temp_output)

    # cleanup temp files
    for p in (temp_input, temp_output):
        try:
            if os.path.exists(p):
                os.remove(p)
        except Exception:
            pass

    dur_sec = len(audio) / float(sr) if sr else 0.0
    if dur_sec < 1.5:
        raise HTTPException(status_code=400, detail="Audio too short (<1.5s for analysis)")

    # normalize audio
    if np.max(np.abs(audio)) > 0:
        audio = audio / np.max(np.abs(audio))

    # feature extraction + inference
    inputs = feature_extractor(audio, sampling_rate=sr, return_tensors="pt", padding="longest")
    with torch.no_grad():
        logits = model(**inputs).logits
        probs = torch.nn.functional.softmax(logits, dim=-1)[0]

    # Debug: log all probabilities
    id2label = getattr(model.config, "id2label", {})
    prob_dict = {id2label[i]: float(probs[i]) for i in range(len(probs))}
    logger.info("Raw emotion probabilities: %s", prob_dict)

    # Also show top-3 sorted
    top3 = sorted(prob_dict.items(), key=lambda x: x[1], reverse=True)[:3]
    logger.info("Top-3 emotions (raw): %s", top3)

    # Pick top prediction
    emotion_idx = int(torch.argmax(probs).item())
    raw_label = id2label.get(emotion_idx, "unknown")

    logger.debug(f"Raw model label: {raw_label}")

    return raw_label, prob_dict, top3

# -------- Routes --------
@app.post("/analyze_speech")
async def analyze_speech_endpoint(input: SpeechInput, request: Request):
    rid = request.headers.get("X-Request-Id", uuid.uuid4().hex[:8])

    if not input.audio:
        raise HTTPException(status_code=400, detail="Field 'audio' is required")

    raw_label, prob_dict, top3 = analyze_audio(input.audio)
    emotion = standardize_emotion(raw_label)

    logger.info(f"Mapped emotion: {emotion} (from raw label: {raw_label})")

    return {
        "status": "success",
        "emotion": emotion,
        "raw_label": raw_label,
        "probabilities": prob_dict,
        "top3": top3,
        "recommendation": get_recommendation(emotion),
        "daily_challenge": get_daily_challenge(emotion),
        "daily_tip": get_daily_tip(emotion),
    }

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "model_loaded": model is not None and feature_extractor is not None,
        "ffmpeg_available": check_ffmpeg(),
        "transformers_available": TRANSFORMERS_AVAILABLE
    }

@app.post("/upload_test")
async def upload_test(file: UploadFile = File(...)):
    """
    Upload a WAV (or any audio) file directly for testing (e.g., RAVDESS samples).
    Returns raw model label, standardized label, full probabilities, and top-3 predictions.
    """
    if model is None or feature_extractor is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    uid = uuid.uuid4().hex
    temp_input = f"tmp_{uid}_{file.filename}"
    temp_output = f"tmp_{uid}.wav"

    # Save uploaded file
    with open(temp_input, "wb") as buffer:
        buffer.write(await file.read())

    # Convert to WAV 16kHz mono using ffmpeg
    cmd = [
        "ffmpeg", "-hide_banner", "-loglevel", "error",
        "-y", "-i", temp_input, "-vn",
        "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
        temp_output
    ]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=45)
    if proc.returncode != 0 or not os.path.exists(temp_output):
        raise HTTPException(status_code=500, detail="FFmpeg conversion failed")

    # Read wav
    audio, sr = load_audio_with_wave(temp_output)

    # Clean up input
    try:
        os.remove(temp_input)
    except Exception:
        pass

    # Normalize audio
    if np.max(np.abs(audio)) > 0:
        audio = audio / np.max(np.abs(audio))

    # Run model
    inputs = feature_extractor(audio, sampling_rate=sr, return_tensors="pt", padding="longest")
    with torch.no_grad():
        logits = model(**inputs).logits
        probs = torch.nn.functional.softmax(logits, dim=-1)[0]

    # Map labels
    id2label = getattr(model.config, "id2label", {})
    prob_dict = {id2label[i]: float(probs[i]) for i in range(len(probs))}
    top3 = sorted(prob_dict.items(), key=lambda x: x[1], reverse=True)[:3]

    emotion_idx = int(torch.argmax(probs).item())
    raw_label = id2label.get(emotion_idx, "unknown")
    emotion = standardize_emotion(raw_label)

    # Clean up output wav
    try:
        os.remove(temp_output)
    except Exception:
        pass

    # Log info
    logger.info(f"File {file.filename} → Raw: {raw_label}, Mapped: {emotion}")
    logger.info(f"Probabilities: {prob_dict}")
    logger.info(f"Top-3: {top3}")

    return {
        "status": "success",
        "file_tested": file.filename,
        "raw_label": raw_label,
        "emotion": emotion,
        "probabilities": prob_dict,
        "top3": top3,
        "recommendation": get_recommendation(emotion),
        "daily_challenge": get_daily_challenge(emotion),
        "daily_tip": get_daily_tip(emotion),
    }
