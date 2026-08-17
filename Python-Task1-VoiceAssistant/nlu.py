"""Natural language understanding: intent recognition beyond keyword matching.

Uses NLTK tokenization + TF-IDF style scoring against intent patterns to
classify free-form spoken sentences into a known intent and extract an
entity (the relevant phrase the user spoke about).
"""

import re
import math
from collections import Counter

try:
    import nltk
    from nltk.tokenize import word_tokenize
    from nltk.corpus import stopwords

    _nltk_ready = False

    def _ensure_nltk():
        global _nltk_ready
        if _nltk_ready:
            return
        for resource in ("tokenizers/punkt", "corpora/stopwords"):
            try:
                nltk.data.find(resource)
            except LookupError:
                nltk.download(resource.split("/")[-1], quiet=True)
        _nltk_ready = True

    def tokenize(text: str) -> list[str]:
        _ensure_nltk()
        try:
            tokens = word_tokenize(text.lower())
        except Exception:
            tokens = text.lower().split()
        try:
            stop_words = set(stopwords.words("english"))
        except Exception:
            stop_words = set()
        return [t for t in tokens if t.isalnum() and t not in stop_words]

except ImportError:
    def tokenize(text: str) -> list[str]:
        return [t for t in text.lower().split() if t.isalnum()]


# Each intent lists example sentences. The matcher converts these to
# token bags and compares them to the user's utterance.
INTENT_PATTERNS: dict[str, list[str]] = {
    "greeting": [
        "hello", "hi there", "hey assistant", "good morning", "good afternoon",
        "how are you", "hello there",
    ],
    "time": [
        "what time is it", "tell me the time", "current time",
        "what is the time now", "time please",
    ],
    "date": [
        "what is the date", "tell me the date", "today's date",
        "what day is it", "what is today",
    ],
    "web_search": [
        "search for", "look up", "google", "find information about",
        "search the web for", "find out about",
    ],
    "email": [
        "send an email", "send a message to", "email someone",
        "compose an email", "send mail",
    ],
    "reminder": [
        "set a reminder", "remind me in", "set a timer",
        "remind me to", "set an alarm",
    ],
    "weather": [
        "what is the weather", "weather forecast", "is it going to rain",
        "temperature outside", "weather in", "how is the weather",
    ],
    "knowledge": [
        "what is", "who is", "tell me about", "explain",
        "what does", "how does", "define",
    ],
    "add_command": [
        "add a custom command", "create a new command",
        "teach you a command", "add command",
    ],
    "exit": [
        "stop listening", "goodbye", "exit", "quit", "shut down",
        "that's all", "stop",
    ],
}


def _cosine_similarity(vec_a: dict[str, float], vec_b: dict[str, float]) -> float:
    dot = sum(vec_a.get(w, 0) * vec_b.get(w, 0) for w in vec_a)
    mag_a = math.sqrt(sum(v * v for v in vec_a.values()))
    mag_b = math.sqrt(sum(v * v for v in vec_b.values()))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def _text_to_vec(tokens: list[str]) -> dict[str, float]:
    counts = Counter(tokens)
    total = sum(counts.values()) or 1
    return {w: c / total for w, c in counts.items()}


def classify_intent(text: str) -> tuple[str, float]:
    """Return (intent_name, confidence) for the given text."""
    user_tokens = tokenize(text)
    if not user_tokens:
        return ("unknown", 0.0)

    user_vec = _text_to_vec(user_tokens)
    best_intent = "unknown"
    best_score = 0.0

    for intent, examples in INTENT_PATTERNS.items():
        all_tokens = []
        for ex in examples:
            all_tokens.extend(tokenize(ex))
        intent_vec = _text_to_vec(all_tokens)
        score = _cosine_similarity(user_vec, intent_vec)
        if score > best_score:
            best_score = score
            best_intent = intent

    return (best_intent, best_score)


def extract_entity(text: str, intent: str) -> str:
    """Extract the subject of the command (e.g. the search query or question).

    Strips leading intent keywords so the remaining text becomes the entity.
    """
    text = text.strip()

    strip_patterns: dict[str, list[str]] = {
        "web_search": [
            r"^(search (the web )?for|search for|look up|google|find (information |out )?(about)?)\s+",
            r"^(find)\s+",
        ],
        "knowledge": [
            r"^(what is|who is|tell me about|explain|what does|how does|define)\s+",
        ],
        "weather": [
            r"^(what is the weather (like )?(in)?|weather in|weather forecast for|how is the weather in)\s+",
            r"^(weather|temperature)\s+",
        ],
        "email": [
            r"^(send (an )?(email|mail|message) to)\s+",
        ],
        "reminder": [
            r"^(set a (reminder|timer|alarm) (to|for|in)?|remind me (to|in))\s+",
        ],
    }

    patterns = strip_patterns.get(intent, [])
    for pattern in patterns:
        cleaned = re.sub(pattern, "", text, flags=re.IGNORECASE).strip()
        if cleaned:
            return cleaned
    return text


def parse_duration(text: str) -> int | None:
    """Extract a duration in seconds from phrases like 'remind me in 5 minutes'."""
    match = re.search(r"(\d+)\s*(second|minute|hour|min|sec|hr)s?", text, re.IGNORECASE)
    if not match:
        return None
    value = int(match.group(1))
    unit = match.group(2).lower()
    multipliers = {
        "second": 1, "sec": 1,
        "minute": 60, "min": 60,
        "hour": 3600, "hr": 3600,
    }
    return value * multipliers.get(unit, 60)
