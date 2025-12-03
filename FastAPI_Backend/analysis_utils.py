# backend/analysis_utils.py
import re
from typing import Dict, List, Tuple
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords

# Download NLTK data if not present
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
except LookupError:
    import ssl
    try:
        _create_unverified_https_context = ssl._create_unverified_context
    except AttributeError:
        pass
    else:
        ssl._create_default_https_context = _create_unverified_https_context
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)

EMOTION_KEYWORDS = {
    "joy": ["happy", "joy", "joyful", "excited", "exciting", "great", "wonderful", 
            "delighted", "bliss", "blissful", "ecstatic", "thrilled", "overjoyed",
            "cheerful", "content", "glad", "pleased", "satisfied"],
    
    "sadness": ["sad", "sadness", "unhappy", "depressed", "depression", "gloomy",
                "melancholy", "sorrow", "grief", "heartbroken", "miserable",
                "disappointed", "hopeless", "lonely", "down"],
    
    "anger": ["angry", "anger", "mad", "furious", "rage", "irritated", "annoyed",
              "frustrated", "aggravated", "outraged", "hostile", "resentful",
              "bitter", "irate", "livid"],
    
    "fear": ["afraid", "fear", "scared", "fearful", "terrified", "anxious",
             "anxiety", "nervous", "worried", "panicked", "horrified", "dread",
             "uneasy", "apprehensive", "frightened"],
    
    "surprise": ["surprised", "surprise", "shocked", "amazed", "astonished",
                 "astounded", "stunned", "startled", "unexpected", "unbelievable"],
    
    "love": ["love", "loving", "adore", "affection", "fondness", "caring",
             "compassion", "kindness", "devotion", "passion", "romance",
             "tender", "warmth", "affectionate"]
}

# Negation words that reverse emotion
NEGATION_WORDS = {"not", "no", "never", "none", "nobody", "nothing", "neither", 
                  "nor", "nowhere", "hardly", "scarcely", "barely", "without",
                  "don't", "doesn't", "didn't", "isn't", "aren't", "wasn't",
                  "weren't", "won't", "wouldn't", "couldn't", "shouldn't",
                  "can't", "cannot"}

# Intensifier words that amplify emotion
INTENSIFIERS = {"very", "extremely", "absolutely", "completely", "totally",
                "utterly", "really", "so", "too", "highly", "deeply",
                "seriously", "terribly", "awfully", "incredibly"}

# Sarcasm indicators
SARCASM_INDICATORS = {"great", "wonderful", "fantastic", "brilliant", "perfect",
                      "lovely", "just what i needed", "oh great", "oh wonderful"}

def preprocess_text(text: str) -> List[str]:
    """Tokenize and clean text"""
    # Convert to lowercase
    text = text.lower()
    
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Tokenize
    tokens = word_tokenize(text)
    
    # Remove stopwords
    stop_words = set(stopwords.words('english'))
    tokens = [token for token in tokens if token not in stop_words]
    
    return tokens

def analyze_text_with_context(text: str) -> Dict:
    """Improved emotion analysis with context awareness"""
    original_text = text
    text_lower = text.lower()
    tokens = preprocess_text(text)
    
    # Initialize scores
    scores = {emotion: 0 for emotion in EMOTION_KEYWORDS.keys()}
    negation_detected = False
    sarcasm_detected = False
    
    # Check for sarcasm
    for indicator in SARCASM_INDICATORS:
        if indicator in text_lower:
            # Look for context clues around sarcasm
            sarcasm_context = re.findall(rf'\b{indicator}\b.*?[.!?]', text_lower)
            if sarcasm_context:
                # Check for negative words after sarcastic phrase
                negative_after = any(word in sarcasm_context[0] for word in 
                                   ["but", "actually", "really", "though"] + 
                                   list(NEGATION_WORDS))
                if negative_after:
                    sarcasm_detected = True
    
    # Analyze each token with context
    for i, token in enumerate(tokens):
        emotion_found = None
        
        # Check for negation words
        if token in NEGATION_WORDS:
            negation_detected = True
            continue
        
        # Check for intensifiers
        intensity_multiplier = 1.5 if token in INTENSIFIERS else 1.0
        
        # Match emotions
        for emotion, keywords in EMOTION_KEYWORDS.items():
            if token in keywords:
                emotion_found = emotion
                
                # Check if this emotion is negated (look back 3 words)
                negated = False
                for j in range(max(0, i-3), i):
                    if tokens[j] in NEGATION_WORDS:
                        negated = True
                        break
                
                if not negated:
                    scores[emotion] += intensity_multiplier
                else:
                    # If negated, reduce score or mark as opposite
                    scores[emotion] -= intensity_multiplier
        
        # Check for emotion intensifiers after the emotion word
        if emotion_found and i < len(tokens) - 1:
            if tokens[i+1] in INTENSIFIERS:
                scores[emotion_found] *= 1.3
    
    # Adjust for sarcasm
    if sarcasm_detected:
        # Invert positive emotions
        for positive_emotion in ["joy", "love", "surprise"]:
            if scores[positive_emotion] > 0:
                scores[positive_emotion] = -scores[positive_emotion]
    
    # Normalize scores to percentages
    total_score = sum(abs(score) for score in scores.values())
    
    if total_score == 0:
        # No emotion detected
        distribution = {emotion: 0.0 for emotion in EMOTION_KEYWORDS.keys()}
        dominant = "neutral"
    else:
        distribution = {}
        for emotion, score in scores.items():
            # Convert to percentage (0-100)
            percentage = (abs(score) / total_score) * 100
            
            # Adjust for negative scores (negated emotions)
            if score < 0:
                percentage = percentage * 0.5  # Reduce weight of negated emotions
            
            distribution[emotion] = round(percentage, 2)
        
        # Find dominant emotion
        dominant = max(scores.items(), key=lambda x: abs(x[1]))[0]
        
        # If the dominant emotion has negative score, it's actually the absence of that emotion
        if scores[dominant] < 0:
            dominant = "neutral"
    
    # Calculate sentiment
    positive_score = sum(distribution.get(e, 0) for e in ["joy", "love", "surprise"])
    negative_score = sum(distribution.get(e, 0) for e in ["sadness", "anger", "fear"])
    neutral_score = 100 - positive_score - negative_score
    
    # Adjust for overall sentiment
    sentiment_scores = {
        "positive": round(positive_score, 2),
        "negative": round(negative_score, 2),
        "neutral": round(max(0, neutral_score), 2)
    }
    
    return {
        "text": original_text,
        "emotion": dominant,
        "emotion_distribution": distribution,
        "sentiment": sentiment_scores,
        "negation_detected": negation_detected,
        "sarcasm_detected": sarcasm_detected
    }

# Backward compatibility
def analyze_text(text: str) -> Dict:
    """Wrapper for backward compatibility"""
    result = analyze_text_with_context(text)
    
    # Return in the expected format
    return {
        "text": result["text"],
        "emotion": result["emotion"],
        "emotion_distribution": result["emotion_distribution"]
    }