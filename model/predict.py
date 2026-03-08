import torch
from pathlib import Path
from transformers import AutoTokenizer, AutoModelForSequenceClassification

ROOT = Path(__file__).resolve().parent
MODEL_DIR = ROOT / "saved_model"

label_names = [
    "emotional_framing",
    "absolutist_language",
    "vague_or_unsupported_claims",
    "propaganda_style_language",
]

tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)

text = "Trump and first lady attend dignified transfer for 6 US troops killed in Kuwait."

inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
with torch.no_grad():
    logits = model(**inputs).logits
    probs = torch.sigmoid(logits).squeeze().tolist()

for label, prob in zip(label_names, probs):
    print(f"{label}: {prob:.3f}")