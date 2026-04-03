import os
from flask import Flask, render_template, request, jsonify, Response, stream_with_context
from openai import OpenAI

app = Flask(__name__)
client = OpenAI(api_key=os.environ.get("XAI_API_KEY"), base_url="https://api.x.ai/v1")

SYSTEM_PROMPT = """You are KawaiiGPT, a friendly and helpful AI assistant with a cute personality. You are also an expert code writer.

When writing code:
- Always use proper syntax highlighting by wrapping code in markdown code blocks with the language name (e.g. ```python, ```javascript, ```html, etc.)
- Provide clear explanations before and after code snippets
- Write clean, well-commented, production-ready code
- Suggest best practices and improvements when relevant

Your personality is:
- Friendly, warm, and encouraging
- Precise and technically accurate
- Creative when solving problems
- Always happy to help debug or explain code

You can handle any programming language or technology stack."""

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    messages = data.get("messages", [])
    
    full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

    def generate():
        try:
            stream = client.chat.completions.create(
                model="grok-3",
                messages=full_messages,
                stream=True,
                max_tokens=4096
            )
            for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    yield delta.content
        except Exception as e:
            yield f"\n\n[Error: {str(e)}]"

    return Response(stream_with_context(generate()), mimetype="text/plain")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
