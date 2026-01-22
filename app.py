import random
from pathlib import Path

from flask import Flask, jsonify, render_template, request

APP_ROOT = Path(__file__).resolve().parent
WORDS_FILE = APP_ROOT / "words.txt"
WORDS_ES_FILE = APP_ROOT / "words_es.txt"

app = Flask(__name__)


def load_words(path: Path) -> list[str]:
    if not path.exists():
        return []
    words = [line.strip() for line in path.read_text(encoding="utf-8").splitlines()]
    return [w for w in words if w]


WORDS_CACHE = load_words(WORDS_FILE)
WORDS_ES_CACHE = load_words(WORDS_ES_FILE)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/words")
def api_words():
    count = request.args.get("count", default=200, type=int)
    lang = request.args.get("lang", default="en", type=str)
    if lang == "es":
        words = WORDS_ES_CACHE
    else:
        words = WORDS_CACHE
    if not words:
        return jsonify({"words": []})

    if count <= 0:
        count = 200

    if len(words) >= count:
        sample = random.sample(words, count)
    else:
        sample = random.choices(words, k=count)

    return jsonify({"words": sample})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
