from pathlib import Path
from typing import List

import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_DIR = Path(__file__).resolve().parents[1] / "model" / "saved_model"

label_names = [
    "emotional_framing",
    "absolutist_language",
    "vague_or_unsupported_claims",
    "propaganda_style_language",
]

tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)

class AnalyzeRequest(BaseModel):
    url: str
    title: str
    sentences: List[str]

@app.get("/")
def root():
    return {"message": "Roshan backend is running"}

def detect_rule_labels(sentence: str):
    labels = []
    lower = sentence.lower()

    absolutist_words = ["everyone", "always", "never", "definitely", "no one"]
    vague_claim_phrases = ["experts say", "many believe", "it is said", "sources claim"]
    emotional_words = ["destroy", "disaster", "crisis", "betrayal", "threat", "shocking"]

    if any(word in lower for word in absolutist_words):
        labels.append("absolutist_language")

    if any(phrase in lower for phrase in vague_claim_phrases):
        labels.append("vague_or_unsupported_claims")

    if any(word in lower for word in emotional_words):
        labels.append("emotional_framing")

    return labels

def score_sentence(sentence: str):
    inputs = tokenizer(sentence, return_tensors="pt", truncation=True, padding=True)
    with torch.no_grad():
        logits = model(**inputs).logits
        probs = torch.sigmoid(logits).squeeze().tolist()

    return {label: float(prob) for label, prob in zip(label_names, probs)}


def score_sentences_batch(sentences: List[str], batch_size: int = 32):
    """Run model on batches of sentences for much faster inference."""
    if not sentences:
        return []

    all_scores = []
    for start in range(0, len(sentences), batch_size):
        batch = sentences[start : start + batch_size]
        inputs = tokenizer(
            batch,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=512,
        )
        with torch.no_grad():
            logits = model(**inputs).logits
            probs = torch.sigmoid(logits)

        for i in range(probs.shape[0]):
            row = probs[i].tolist()
            all_scores.append(
                {label: float(prob) for label, prob in zip(label_names, row)}
            )

    return all_scores

@app.post("/analyze")
def analyze_article(data: AnalyzeRequest):
    flagged_sentences = []
    overall = set()

    if not data.sentences:
        return {
            "overall_risk_indicators": [],
            "sentences": []
        }

    batch_scores = score_sentences_batch(data.sentences)

    for i, sentence in enumerate(data.sentences):
        model_scores = batch_scores[i] if i < len(batch_scores) else {}

        model_labels = [
            label for label, prob in model_scores.items()
            if prob >= 0.5
        ]

        rule_labels = detect_rule_labels(sentence)

        combined_labels = sorted(set(model_labels + rule_labels))

        if combined_labels:
            flagged_sentences.append({
                "id": f"s{i+1}",
                "text": sentence,
                "labels": combined_labels,
                "confidence": max(model_scores.values()) if model_scores else 0.0,
                "scores": model_scores,
                "rule_labels": rule_labels,
                "model_labels": model_labels,
            })

            for label in combined_labels:
                overall.add(label)

    return {
        "overall_risk_indicators": list(overall),
        "sentences": flagged_sentences
    }