import torch
from pathlib import Path
from transformers import AutoTokenizer, AutoModelForSequenceClassification

ROOT = Path(__file__).resolve().parent
MODEL_DIR = ROOT / "saved_model"

label_names = [
    "emotional framing",
    "absolutist language",
    "vague or unsupported claims",
    "propaganda style language",
]

tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)

text = "The Lebanese military, which has sought to distance itself from the war between Hezbollah and Israel, said its units then carried out \"immediate alert and defence measures\", using flare bombs to detect the landing spot."

inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
with torch.no_grad():
    logits = model(**inputs).logits
    probs = torch.sigmoid(logits).squeeze().tolist()

for label, prob in zip(label_names, probs):
    print(f"{label}: {prob:.3f}")