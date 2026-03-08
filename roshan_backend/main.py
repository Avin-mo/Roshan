from pathlib import Path
from typing import List
import os

import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import logging
import time

# Configure logger for the backend
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("roshan_backend")

# If running under uvicorn, reuse uvicorn's handlers so logs appear in the console
try:
    uv_logger = logging.getLogger("uvicorn.error")
    if uv_logger.handlers:
        logger.handlers = uv_logger.handlers
        logger.setLevel(uv_logger.level)
    else:
        ch = logging.StreamHandler()
        ch.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
        logger.addHandler(ch)
except Exception:
    # best-effort; don't crash the server if logging tweak fails
    pass

# Respect environment flag to enable rule-based labels; default to transformer-only
USE_RULE_LABELS = os.environ.get('USE_RULE_LABELS', 'false').lower() in ('1', 'true', 'yes')
logger.info(f"USE_RULE_LABELS set to: {USE_RULE_LABELS}")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_DIR = str(Path(__file__).resolve().parents[1] / "model" / "saved_model")

label_names = [
    "emotional_framing",
    "absolutist_language",
    "vague_or_unsupported_claims",
    "propaganda_style_language",
]

tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR, local_files_only=True)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR, local_files_only=True)

# Log model load
logger.info(f"Loaded tokenizer and model from: {MODEL_DIR}")

class AnalyzeRequest(BaseModel):
    url: str
    title: str
    sentences: List[str]

@app.get("/")
def root():
    return {"message": "Roshan backend is running"}

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

    t0 = time.time()
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

    duration = time.time() - t0
    logger.info(f"Model inference for {len(sentences)} sentences completed in {duration:.3f}s")
    return all_scores

@app.post("/analyze")
def analyze_article(data: AnalyzeRequest):
    t_start = time.time()
    flagged_sentences = []
    overall = set()

    logger.info(f"Analyze request received: url={data.url}, title_len={len(data.title or '')}, num_sentences={len(data.sentences or [])}")

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

        # Transformer-only decision: use model_labels only
        combined_labels = sorted(set(model_labels))

        if combined_labels:
            flagged_sentences.append({
                "id": f"s{i+1}",
                "text": sentence,
                "labels": combined_labels,
                "confidence": max(model_scores.values()) if model_scores else 0.0,
                "scores": model_scores,
                "model_labels": model_labels,
            })

            for label in combined_labels:
                overall.add(label)
            # Log detected labels and scores for this sentence
            snippet = (sentence[:120] + '...') if len(sentence) > 120 else sentence
            logger.info(
                f"Flagged s{i+1}: labels={combined_labels}, confidence={max(model_scores.values()) if model_scores else 0.0:.3f}, model_labels={model_labels}, snippet=\"{snippet}\""
            )

    t_end = time.time()
    logger.info(f"Analysis complete: total_sentences={len(data.sentences)}, flagged={len(flagged_sentences)}, total_time={t_end - t_start:.3f}s")

    return {
        "overall_risk_indicators": list(overall),
        "sentences": flagged_sentences
    }