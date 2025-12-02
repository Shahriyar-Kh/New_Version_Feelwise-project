from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from analysis_utils import analyze_text

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextRequest(BaseModel):
    text: str

class AnalysisResponse(BaseModel):
    text: str
    emotion: str
    emotion_distribution: dict

@app.post("/analyze", response_model=AnalysisResponse)
def analyze(request: TextRequest):
    return analyze_text(request.text)

if __name__ == "__main__":
    uvicorn.run("text-analysis-api:app", host="0.0.0.0", port=8001, reload=True)
