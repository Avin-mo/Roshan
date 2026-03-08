import google.generativeai as genai
from flask import Flask, request, jsonify
from flask_cors import CORS

# Configure with your API key (keep this secret in real use)
genai.configure(api_key="AIzaSyCp4vgrdAxkHWxUs4TWjO8l3zRzlg5XfiE")

# Use an appropriate Gemini model
MODEL_NAME = "gemini-1.5-flash"

app = Flask(__name__)
CORS(app)

@app.route("/explain", methods=["POST"])
def explain():
    data = request.get_json(force=True)
    sentence = (data.get("text") or "").strip()
    labels = data.get("labels") or []

    if not sentence:
        return jsonify({"error": "No text provided."}), 400

    # Build a strict prompt that asks Gemini to only return the concise reason(s)
    prompt = (
        "You are an assistant that explains concisely why a sentence was flagged. "
        "Given the sentence and the list of labels, return a single concise explanation that describes why the sentence matches those labels. "
        "Do NOT add any extra information, suggestions, or safety warnings — only return the explanation itself.\n\n"
        f"Labels: {labels}\n"
        f"Sentence: \"{sentence}\"\n\n"
        "Answer:" 
    )

    try:
        # Use the chat-style API. The exact client signature may vary by client version.
        resp = genai.chat.create(model=MODEL_NAME, messages=[{"role": "user", "content": prompt}])

        # Extract text from response (client surface may vary). Try common attributes.
        explanation = None
        if hasattr(resp, "content"):
            # Some client variants expose content directly
            explanation = resp.content
        elif isinstance(resp, dict) and resp.get("candidates"):
            explanation = resp["candidates"][0].get("content")
        else:
            # Fallback to string representation
            explanation = str(resp)

        # Trim and return only the explanation
        explanation = str(explanation).strip()
        return jsonify({"explanation": explanation})

    except Exception as e:
        return jsonify({"error": "Gemini request failed: " + str(e)}), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8001)

