import os
import logging
import re
import google.generativeai as genai
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
API_KEY = os.environ.get('GEMINI_API_KEY')
if not API_KEY:
    # Do not configure genai without a key; the service will return errors when called
    # We keep the app running but will return a 500 when explain is called without a key.
    genai_configured = False
else:
    genai.configure(api_key=API_KEY)
    genai_configured = True

# Use an appropriate Gemini model
MODEL_NAME = 'gemini-2.0-flash'

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
                parts.append("Uses urgent or emotionally charged framing (words like 'must' or 'urgent').")
            else:
                parts.append("Contains emotionally framed language that pressures the reader.")

        elif label == "absolutist_language":
            if any(w in sl for w in ["always", "never", "everyone", "nobody", "all", "must"]):
                parts.append("Uses absolutist terms that leave no room for nuance (e.g. 'always', 'never', 'must').")
            else:
                parts.append("Presents claims in absolute terms without qualifiers.")

        elif label == "vague_or_unsupported_claims":
            if any(w in sl for w in ["experts", "studies show", "research shows", "reported", "according to"]):
                parts.append("Makes a claim without citing evidence or specific sources.")
            else:
                parts.append("Contains a claim that is vague or lacks supporting evidence.")

        elif label == "propaganda_style_language":
            parts.append("Uses propaganda-style or persuasive rhetoric intended to influence opinion.")

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
    if not genai_configured and not FORCE_LOCAL_EXPLAIN:
        return jsonify({'error': 'Gemini API key not configured on server.'}), 500

    data = request.get_json(force=True)
    sentence = (data.get('text') or '').strip()
    labels = data.get('labels') or []

    if not sentence:
        return jsonify({'error': 'No text provided.'}), 400

    # If forced to use local explainer or genai isn't configured, return rule-based explanation
    if FORCE_LOCAL_EXPLAIN or not genai_configured:
        explanation = local_explain(sentence, labels)
        return jsonify({'explanation': explanation, 'model': 'local_rule_based'})

    # Otherwise attempt to call Gemini and fall back on any failure
    prompt = (
        "You are an assistant that explains why a sentence was flagged for the provided labels. "
        "For each label in the list, produce a focused explanation (1–3 short sentences each), up to about 300 characters in total, that states why the sentence matches that label and — when possible — name the specific words or phrases in the sentence that triggered it. "
        "Do NOT add advice, safety warnings, policy text, or any extra unrelated information. Only return the explanation itself.\n\n"
        f"Labels: {labels}\n"
        f"Sentence: \"{sentence}\"\n\n"
        "Answer:"
    )

    try:
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(prompt)

        # modern client exposes .text
        explanation = getattr(response, 'text', None) or str(response)
        explanation = str(explanation).strip()
        return jsonify({'explanation': explanation, 'model': MODEL_NAME})

    except Exception as e:
        logger.exception("Gemini call failed, falling back to local explainer")
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
    if not genai_configured and not FORCE_LOCAL_EXPLAIN:
        return jsonify({'error': 'Gemini API key not configured on server.'}), 500

    data = request.get_json(force=True)
    sentence = (data.get('text') or '').strip()
    labels = data.get('labels') or []
    question = (data.get('question') or '').strip()

    if not sentence:
        return jsonify({'error': 'No text provided.'}), 400
    if not question:
        return jsonify({'error': 'No follow-up question provided.'}), 400

    # If forced to use local explainer or genai isn't configured, use simple local fallback
    if FORCE_LOCAL_EXPLAIN or not genai_configured:
        # Provide a basic response using the existing local_explain function
        explanation = local_explain(sentence, labels)
        return jsonify({'answer': f"(Local fallback - Gemini unavailable)\n\n{explanation}", 'model': 'local_rule_based'})

    # Construct a follow-up prompt for Gemini
    prompt = (
        "You are an assistant that answers follow-up questions about why a sentence was flagged for specific rhetorical patterns. "
        "You are given:\n"
        "1. A sentence that was flagged\n"
        "2. The labels it was flagged with\n"
        "3. A follow-up question from the user\n\n"
        "Answer the user's question directly and specifically. When asked 'how', 'which part', 'where', or 'in what way', "
        "quote the exact words or phrases from the sentence that triggered each label. Be specific and concrete.\n\n"
        "Do NOT repeat the label definitions. Do NOT add advice or warnings. Just answer the question.\n\n"
        f"Sentence: \"{sentence}\"\n"
        f"Labels: {labels}\n"
        f"User question: \"{question}\"\n\n"
        "Answer:"
    )

    try:
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(prompt)
        answer = getattr(response, 'text', None) or str(response)
        answer = str(answer).strip()
        return jsonify({'answer': answer, 'model': MODEL_NAME})

    except Exception as e:
        logger.exception("Gemini follow-up call failed")
        return jsonify({'answer': f"Error: {str(e)}", 'model': 'error', 'note': str(e)})


@app.route('/', methods=['GET'])
def root():
    """Health check for debugging the extension connection."""
    return jsonify({
        'status': 'ok',
        'genai_configured': bool(genai_configured),
        'model': MODEL_NAME
    }), 200


if __name__ == '__main__':
    # Bind to all interfaces so localhost / 127.0.0.1 / ::1 all succeed from the browser/extension
    app.run(host='0.0.0.0', port=8001)

