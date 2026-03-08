import json
import torch
import numpy as np
from pathlib import Path
from sklearn.metrics import classification_report, confusion_matrix
from transformers import AutoTokenizer, AutoModelForSequenceClassification

ROOT = Path(__file__).resolve().parent
MODEL_DIR = ROOT / "saved_model"
DATA_PATH = ROOT / "Dataset" / "propaganda_dataset_500.json"

label_names = [
    "emotional_framing",
    "absolutist_language",
    "vague_or_unsupported_claims",
    "propaganda_style_language",
]

print("Loading model...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)

print("Loading dataset...")
with open(DATA_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

texts = [row["text"] for row in data]
labels = np.array([row["multi_hot"] for row in data])

print(f"\nEvaluating on {len(texts)} examples...\n")

# Batch prediction
all_preds = []
batch_size = 16

for i in range(0, len(texts), batch_size):
    batch_texts = texts[i:i+batch_size]
    inputs = tokenizer(batch_texts, return_tensors="pt", truncation=True, padding=True, max_length=128)
    
    with torch.no_grad():
        logits = model(**inputs).logits
        probs = torch.sigmoid(logits)
        preds = (probs >= 0.5).int().numpy()
        all_preds.append(preds)

all_preds = np.vstack(all_preds)

# Overall metrics
print("=" * 60)
print("OVERALL METRICS")
print("=" * 60)
print(classification_report(labels, all_preds, target_names=label_names, zero_division=0))

# Per-label analysis
print("\n" + "=" * 60)
print("PER-LABEL ANALYSIS")
print("=" * 60)

for i, label in enumerate(label_names):
    true_labels = labels[:, i]
    pred_labels = all_preds[:, i]
    
    tp = np.sum((true_labels == 1) & (pred_labels == 1))
    fp = np.sum((true_labels == 0) & (pred_labels == 1))
    fn = np.sum((true_labels == 1) & (pred_labels == 0))
    tn = np.sum((true_labels == 0) & (pred_labels == 0))
    
    print(f"\n{label}:")
    print(f"  True Positives:  {tp}")
    print(f"  False Positives: {fp}")
    print(f"  False Negatives: {fn}")
    print(f"  True Negatives:  {tn}")
    
    if tp + fp > 0:
        precision = tp / (tp + fp)
        print(f"  Precision: {precision:.3f}")
    if tp + fn > 0:
        recall = tp / (tp + fn)
        print(f"  Recall: {recall:.3f}")

# Show some example predictions
print("\n" + "=" * 60)
print("EXAMPLE PREDICTIONS (first 5)")
print("=" * 60)

for i in range(min(5, len(texts))):
    print(f"\nText: {texts[i][:100]}...")
    print(f"True labels: {[label_names[j] for j, val in enumerate(labels[i]) if val == 1]}")
    print(f"Predicted:   {[label_names[j] for j, val in enumerate(all_preds[i]) if val == 1]}")
