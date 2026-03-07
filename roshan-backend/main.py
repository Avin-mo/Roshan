from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI()


class ArticleRequest(BaseModel):
    sentences: List[str]


def detect_labels(sentence: str):
    labels = []
    lower = sentence.lower()

    if "everyone" in lower or "always" in lower:
        labels.append("absolutist language")

    if "experts say" in lower or "sources say" in lower:
        labels.append("vague or unsupported claim")

    if "crisis" in lower or "destroy" in lower:
        labels.append("emotional persuasion")

    return labels


@app.post("/analyze")
def analyze_article(data: ArticleRequest):

    results = []

    for sentence in data.sentences:
        labels = detect_labels(sentence)

        results.append({
            "text": sentence,
            "labels": labels
        })

    return {
        "sentences": results
    }