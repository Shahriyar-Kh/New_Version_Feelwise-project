# backend/analysis_utils.py
EMOTION_KEYWORDS = {
    "joy": ["happy", "joy", "excited", "great", "wonderful", "delighted"],
    "sadness": ["sad", "down", "unhappy", "depressed", "gloomy"],
    "anger": ["angry", "mad", "furious", "irritated", "annoyed"],
    "fear": ["afraid", "scared", "fearful", "nervous", "worried"],
    "surprise": ["surprised", "shocked", "amazed", "astonished"],
    "love": ["love", "caring", "affection", "compassion", "kindness"]
}

def analyze_text(text: str):
    text = text.lower()
    scores = {emotion: 0 for emotion in EMOTION_KEYWORDS.keys()}

    for emotion, keywords in EMOTION_KEYWORDS.items():
        for word in keywords:
            if word in text:
                scores[emotion] += 1

    total = sum(scores.values()) or 1
    distribution = {e: round((c / total) * 100, 2) for e, c in scores.items()}
    dominant = max(distribution, key=distribution.get)

    return {
        "text": text,
        "emotion": dominant,
        "emotion_distribution": distribution
    }
