import os
import logging
import re
from openai import OpenAI
from flask import Flask, request, jsonify
from flask_cors import CORS

# Try to load .env in development if python-dotenv is installed
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

logger = logging.getLogger(__name__)

# Read API key from environment variable
API_KEY = os.environ.get('OPENAI_API_KEY')
if not API_KEY:
    # Do not configure client without a key; the service will return errors when called
    # We keep the app running but will return a 500 when explain is called without a key.
    openai_configured = False
    client = None
else:
    client = OpenAI(api_key=API_KEY)
    openai_configured = True

# Use GPT-5-mini model
MODEL_NAME = 'gpt-5-mini'
# Human-friendly display name used in JSON responses
MODEL_DISPLAY = 'ChatGPT'

# Allow forcing a local rule-based explainer via env var for unlimited free usage
FORCE_LOCAL_EXPLAIN = os.environ.get("FORCE_LOCAL_EXPLAIN", "false").lower() in ("1", "true", "yes")

app = Flask(__name__)
CORS(app)


def local_explain(sentence: str, labels: list) -> str:
    """Simple rule-based fallback explainer. Not a large model, but deterministic and free.
    It returns concise explanations for known labels and otherwise uses heuristics on the sentence.
    """
    s = (sentence or "").strip()
    sl = s.lower()

    parts = []

    for label in labels:
        if label == "emotional_framing":
            if any(w in sl for w in ["must", "urgent", "immediately", "now", "today", "without delay"]):
                parts.append("Contains urgent or emotionally charged framing (words like 'must' or 'urgent').")
            else:
                parts.append("Uses emotionally framed language that could pressure the reader.")

        elif label == "absolutist_language":
            if any(w in sl for w in ["always", "never", "everyone", "nobody", "all", "must"]):
                parts.append("Uses absolutist terms that leave little room for nuance (e.g. 'always', 'never', 'must').")
            else:
                parts.append("Presents claims in absolute terms without qualifiers.")

        elif label == "vague_or_unsupported_claims":
            if any(w in sl for w in ["experts", "studies show", "research shows", "reported", "according to"]):
                parts.append("Makes a claim without citing specific evidence or sources.")
            else:
                parts.append("Contains a claim that is vague or lacks clear supporting evidence.")

        elif label == "propaganda_style_language":
            parts.append("Employs persuasive or propaganda-style rhetoric intended to influence opinion.")

        else:
            parts.append(f"Matches label '{label}'.")

    # If no labels provided, try some heuristics
    if not parts:
        if any(w in sl for w in ["must", "urgent", "immediately", "now"]):
            return "Uses urgent/authoritative phrasing (e.g. 'must'), which can be emotionally framed."
        if any(w in sl for w in ["always", "never", "everyone", "nobody", "all"]):
            return "Uses absolutist language that overgeneralizes."
        if any(w in sl for w in ["experts", "studies", "research", "reported"]):
            return "Contains a claim that may be vague or unsupported without citation."
        return "No strong propaganda indicators detected by the rule-based fallback."

    # Join fragments into a short explanation
    explanation = " ".join(parts)
    # Keep it concise
    if len(explanation) > 400:
        explanation = explanation[:400].rstrip() + "..."
    return explanation


@app.route('/explain', methods=['POST'])
def explain():
    if not openai_configured and not FORCE_LOCAL_EXPLAIN:
        return jsonify({'error': 'OpenAI API key not configured on server.'}), 500

    data = request.get_json(force=True)
    sentence = (data.get('text') or '').strip()
    labels = data.get('labels') or []

    if not sentence:
        return jsonify({'error': 'No text provided.'}), 400

    # If forced to use local explainer or openai isn't configured, return rule-based explanation
    if FORCE_LOCAL_EXPLAIN or not openai_configured:
        explanation = local_explain(sentence, labels)
        return jsonify({'explanation': explanation, 'model': 'local_rule_based'})

    # Compose a system + user message to improve reliability and encourage structured output
    system_msg = (
        "You are a neutral, explanatory assistant that clarifies why short text snippets were flagged for specific rhetorical labels. "
        "Be factual and non-judgmental; you may be slightly more descriptive when helpful. For each label, produce 2–4 short sentences. When referring to the sentence, quote the exact words or short phrases that triggered the label."
    )

    user_msg = (
        f"Labels: {labels}\n"
        f"Sentence: \"{sentence}\"\n\n"
        "Instructions: For each label return an object with the keys: 'label' (the label name), 'explanation' (2-4 short sentences), and 'highlights' (list of quoted substrings from the sentence that triggered the label, if any). "
        "Return ONLY a JSON object with a top-level key 'explanations' whose value is a list of these objects. Do not include any additional commentary or extraneous text."
    )

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.2,
            max_tokens=600,
        )

        explanation = response.choices[0].message.content.strip()
        return jsonify({'explanation': explanation, 'model': MODEL_DISPLAY})

    except Exception as e:
        logger.exception("OpenAI call failed, falling back to local explainer")
        explanation = local_explain(sentence, labels)
        # return the fallback explanation but include a note for debugging
        return jsonify({'explanation': explanation, 'model': 'local_rule_based', 'note': str(e)})


@app.route('/followup', methods=['POST'])
def followup():
    """Answer a user follow-up question about why a sentence was flagged.

    Expects JSON with keys:
      - text: the original sentence
      - labels: list of labels
      - question: the user's follow-up question (e.g. "Which words triggered this?" or "Can you expand on propaganda language?")
    """
    if not openai_configured and not FORCE_LOCAL_EXPLAIN:
        return jsonify({'error': 'OpenAI API key not configured on server.'}), 500

    data = request.get_json(force=True)
    sentence = (data.get('text') or '').strip()
    labels = data.get('labels') or []
    question = (data.get('question') or '').strip()

    if not sentence:
        return jsonify({'error': 'No text provided.'}), 400
    if not question:
        return jsonify({'error': 'No follow-up question provided.'}), 400

    # If forced to use local explainer or openai isn't configured, use simple local fallback
    if FORCE_LOCAL_EXPLAIN or not openai_configured:
        # Provide a basic response using the existing local_explain function
        explanation = local_explain(sentence, labels)
        return jsonify({'answer': f"(Local fallback - OpenAI unavailable)\n\n{explanation}", 'model': 'local_rule_based'})

    system_msg = (
        "You are a neutral assistant answering a specific follow-up question about why a sentence was flagged. "
        "When asked 'how', 'which part', 'where', or similar, quote the exact words or short phrases from the sentence that triggered the label and give a brief (1-3 sentence) explanation. You may provide slightly more descriptive context if it helps the user's understanding."
    )

    user_msg = (
        f"Sentence: \"{sentence}\"\n"
        f"Labels: {labels}\n"
        f"User question: \"{question}\"\n\n"
        "Instructions: Answer concisely and directly (1-3 short sentences). If quoting parts of the sentence, wrap them in double quotes. Do not repeat label definitions or add unrelated commentary."
    )

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.2,
            max_tokens=600,
        )
        answer = response.choices[0].message.content.strip()
        return jsonify({'answer': answer, 'model': MODEL_DISPLAY})

    except Exception as e:
        logger.exception("OpenAI follow-up call failed")
        return jsonify({'answer': f"Error: {str(e)}", 'model': 'error', 'note': str(e)})


@app.route('/', methods=['GET'])
def root():
    """Health check for debugging the extension connection."""
    return jsonify({
        'status': 'ok',
        'chatgpt_configured': bool(openai_configured),
        'model': MODEL_DISPLAY
    }), 200


if __name__ == '__main__':
    # Bind to all interfaces so localhost / 127.0.0.1 / ::1 all succeed from the browser/extension
    app.run(host='0.0.0.0', port=8001)

