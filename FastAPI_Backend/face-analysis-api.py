import os
os.environ["DEEPFACE_BACKEND"] = "torch"  # 🔥 Force Torch backend (skip TensorFlow)

import base64
import random
import numpy as np
import cv2
from deepface import DeepFace
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# ----------------------
# FastAPI Setup
# ----------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------
# Pydantic Model
# ----------------------
class ImageData(BaseModel):
    image: str  # Base64 string

# ----------------------
# Emotion Responses
# ----------------------
EMOTION_RESPONSES = {
    "happy": {
        "recommendations": [
            "Share your happiness with someone today!",
            "Your positivity is contagious - spread it around!",
            "Celebrate this joyful moment with a small treat."
        ],
        "challenges": [
            "Compliment three people today.",
            "Do something kind for a stranger.",
            "Write down three things you're grateful for."
        ],
        "tips": [
            "Happiness is amplified when shared.",
            "Practice mindfulness to appreciate happy moments.",
            "Create a happiness jar to collect joyful memories."
        ]
    },
    "sad": {
        "recommendations": [
            "Reach out to a friend or loved one for support.",
            "Engage in a comforting activity you enjoy.",
            "Remember that emotions are temporary - this too shall pass."
        ],
        "challenges": [
            "Write down three things you appreciate about yourself.",
            "Listen to uplifting music for 10 minutes.",
            "Do one small act of self-care today."
        ],
        "tips": [
            "It's okay to not be okay sometimes.",
            "Tears can be healing - don't suppress them.",
            "Consider talking to a professional if sadness persists."
        ]
    },
    "angry": {
        "recommendations": [
            "Take five deep breaths before reacting.",
            "Step away from the situation for a few minutes.",
            "Write down what's bothering you, then tear it up."
        ],
        "challenges": [
            "Practice counting to 10 before responding.",
            "Identify the underlying need behind your anger.",
            "Try a physical activity to release tension."
        ],
        "tips": [
            "Anger is often a secondary emotion - look deeper.",
            "Use 'I feel' statements when expressing yourself.",
            "Progressive muscle relaxation can help calm anger."
        ]
    },
    "neutral": {
        "recommendations": [
            "Check in with your body for subtle emotions.",
            "Try a brief mindfulness exercise.",
            "Engage in an activity that typically brings you joy."
        ],
        "challenges": [
            "Identify three subtle emotions you're feeling.",
            "Express gratitude for something small today.",
            "Do something creative to explore your feelings."
        ],
        "tips": [
            "Neutral is a valid emotional state.",
            "Being neutral can be a sign of emotional balance.",
            "Use neutral moments for reflection and planning."
        ]
    }
}

def get_random_response(responses):
    return random.choice(responses) if responses else ""

# ----------------------
# Emotion Analysis Endpoint
# ----------------------
@app.post("/analyze_face")
async def analyze_face(data: ImageData):
    try:
        # Decode base64 image
        image_data = base64.b64decode(data.image.split(",")[1])
        np_arr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("Invalid image data provided")

        # 🔥 Use DeepFace with Torch backend
        result = DeepFace.analyze(
            img,
            actions=['emotion'],
            enforce_detection=False,
            detector_backend="opencv"
        )

        emotion = result[0]['dominant_emotion'].lower()

        # Get responses (fallback to neutral if not found)
        responses = EMOTION_RESPONSES.get(emotion, EMOTION_RESPONSES["neutral"])

        return {
            "emotion": emotion,
            "recommendation": get_random_response(responses["recommendations"]),
            "challenge": get_random_response(responses["challenges"]),
            "tip": get_random_response(responses["tips"]),
            "trend": {
                "labels": ["Mon", "Tue", "Wed", "Thu", "Fri"],
                "values": [random.randint(1, 5) for _ in range(5)]
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze face: {str(e)}")

# ----------------------
# Run server
# ----------------------
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)
