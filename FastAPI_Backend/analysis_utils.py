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
    "joy": ["happy", "joy", "excited", "great", "wonderful", "delighted", 
            "ecstatic", "overjoyed", "thrilled", "bliss", "blissful",
            "cheerful", "content", "glad", "pleased", "satisfied", "amazing"],
    
    "sadness": ["sad", "down", "unhappy", "depressed", "gloomy", "depressing",
                "melancholy", "sorrow", "grief", "heartbroken", "miserable",
                "disappointed", "hopeless", "lonely", "bad", "worse"],
    
    "anger": ["angry", "mad", "furious", "irritated", "annoyed", "rage",
              "frustrated", "aggravated", "outraged", "hostile", "resentful",
              "bitter", "irate", "livid", "hate", "hatred"],
    
    "fear": ["afraid", "scared", "fearful", "nervous", "worried", "anxious",
             "terrified", "panicked", "horrified", "dread", "uneasy",
             "apprehensive", "frightened", "tense", "stressed"],
    
    "surprise": ["surprised", "shocked", "amazed", "astonished", "astounded",
                 "stunned", "startled", "unexpected", "unbelievable", "wow"],
    
    "love": ["love", "caring", "affection", "compassion", "kindness", "adore",
             "fondness", "devotion", "passion", "romance", "tender", "warmth",
             "affectionate", "cherish", "treasure"]
}

# Context words that modify emotion intensity
INTENSIFIERS = {
    "very", "really", "extremely", "absolutely", "completely", "totally",
    "utterly", "so", "too", "highly", "deeply", "seriously", "terribly",
    "awfully", "incredibly", "absolutely", "quite", "particularly"
}

NEGATORS = {
    "not", "no", "never", "none", "nobody", "nothing", "neither", "nor",
    "nowhere", "hardly", "scarcely", "barely", "without", "don't", "doesn't",
    "didn't", "isn't", "aren't", "wasn't", "weren't", "won't", "wouldn't",
    "couldn't", "shouldn't", "can't", "cannot"
}

# Sarcasm patterns
SARCASM_PATTERNS = [
    r"oh\s+(great|wonderful|fantastic|perfect|lovely)",
    r"just\s+what\s+i\s+needed",
    r"as\s+if",
    r"like\s+i\s+really\s+need",
    r"thanks\s+a\s+lot",
    r"that's\s+just\s+(great|perfect)",
    r"how\s+(nice|lovely)"
]

def analyze_text(text: str):
    text_lower = text.lower().strip()
    
    # Check for sarcasm first
    sarcasm_detected = False
    for pattern in SARCASM_PATTERNS:
        if re.search(pattern, text_lower, re.IGNORECASE):
            sarcasm_detected = True
            break
    
    # Initialize scores
    scores = {emotion: 0 for emotion in EMOTION_KEYWORDS.keys()}
    word_count = 0
    
    # Split into words
    words = re.findall(r'\b\w+\b', text_lower)
    words_with_context = []
    
    # Add context tags for negators and intensifiers
    for i, word in enumerate(words):
        context_word = word
        
        # Check for negators (look at previous word)
        if i > 0 and words[i-1] in NEGATORS:
            context_word = f"not_{word}"
        
        # Check for intensifiers (look at next word)
        if i < len(words) - 1 and words[i+1] in INTENSIFIERS:
            context_word = f"{word}_very"
        
        words_with_context.append(context_word)
        word_count += 1
    
    # Score each word
    for i, word in enumerate(words_with_context):
        base_word = word.replace("not_", "").replace("_very", "")
        negated = word.startswith("not_")
        intensified = word.endswith("_very")
        
        # Check each emotion
        for emotion, keywords in EMOTION_KEYWORDS.items():
            if base_word in keywords:
                # Base score
                score = 1
                
                # Adjust for negation
                if negated:
                    score = -0.5  # Negative score for negated emotions
                
                # Adjust for intensification
                if intensified:
                    score *= 2
                
                # Adjust for sarcasm
                if sarcasm_detected:
                    if emotion in ["joy", "love", "surprise"]:  # Positive emotions
                        score = -abs(score)  # Invert positive emotions
                    elif emotion in ["sadness", "anger", "fear"]:  # Negative emotions
                        score = abs(score) * 1.5  # Amplify negative emotions
                
                scores[emotion] += score
    
    # Calculate percentages
    total_emotion_score = sum(abs(score) for score in scores.values())
    
    if total_emotion_score == 0:
        # Check for neutral indicators
        if any(word in text_lower for word in ["meeting", "scheduled", "tomorrow", "office"]):
            distribution = {e: 0 for e in scores.keys()}
            return {
                "text": text,
                "emotion": "neutral",
                "emotion_distribution": distribution,
                "sarcasm_detected": sarcasm_detected
            }
        else:
            # Distribute evenly among detected emotions or mark neutral
            distribution = {e: 0 for e in scores.keys()}
            dominant = "neutral"
    
    else:
        # Calculate percentages
        distribution = {}
        for emotion, score in scores.items():
            percentage = (abs(score) / total_emotion_score) * 100
            
            # Adjust negated emotions downward
            if score < 0:
                percentage *= 0.3
            
            distribution[emotion] = round(percentage, 2)
        
        # Find dominant emotion (highest absolute score)
        dominant = max(scores.items(), key=lambda x: abs(x[1]))[0]
        
        # If dominant is negated, choose next best or neutral
        if scores[dominant] < 0:
            positive_emotions = {k: v for k, v in scores.items() if v > 0}
            if positive_emotions:
                dominant = max(positive_emotions.items(), key=lambda x: x[1])[0]
            else:
                dominant = "neutral"
    
    # Calculate sentiment
    positive_total = (distribution.get("joy", 0) + 
                      distribution.get("love", 0) + 
                      distribution.get("surprise", 0))
    
    negative_total = (distribution.get("sadness", 0) + 
                      distribution.get("anger", 0) + 
                      distribution.get("fear", 0))
    
    # Adjust for sarcasm
    if sarcasm_detected:
        # Invert sentiment for sarcasm
        positive_total, negative_total = negative_total, positive_total
    
    # Add sentiment to result
    result = {
        "text": text,
        "emotion": dominant,
        "emotion_distribution": distribution,
        "sarcasm_detected": sarcasm_detected
    }
    
    return result