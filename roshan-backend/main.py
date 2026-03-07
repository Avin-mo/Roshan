from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import re
from Dbias.bias_classification import *
from Dbias.bias_recognition import *


app = FastAPI()

# Allow requests from your extension / local testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    url: str
    title: str
    sentences: List[str]

def detect_labels(sentence: str):
    labels = []
    lower = sentence.lower()

    absolutist_words = ["everyone", "always", "never", "definitely", "no one"]
    vague_claim_phrases = ["experts say", "many believe", "it is said", "sources claim"]
    emotional_words = ["destroy", "disaster", "crisis", "betrayal", "threat", "shocking"]

    if any(word in lower for word in absolutist_words):
        labels.append("absolutist language")

    if any(phrase in lower for phrase in vague_claim_phrases):
        labels.append("vague or unsupported claim")

    if any(word in lower for word in emotional_words):
        labels.append("high persuasion / emotional framing")

    return labels

@app.get("/")
def root():
    return {"message": "Roshan backend is running"}

@app.post("/analyze")
def analyze_article(data: AnalyzeRequest):
    flagged_sentences = []
    overall = set()

    for i, sentence in enumerate(data.sentences):
        labels = detect_labels(sentence)

        if labels:
            flagged_sentences.append({
                "id": f"s{i+1}",
                "text": sentence,
                "labels": labels,
                "confidence": 0.75
            })
            for label in labels:
                overall.add(label)

    return {
        "overall_risk_indicators": list(overall),
        "sentences": flagged_sentences
    }