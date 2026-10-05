"""Splitting plain text into normalised word tokens."""

PUNCTUATION = ".,;:!?\"'()[]{}"

STOPWORDS = frozenset(["a", "an", "the", "and", "or", "of", "to", "in"])


def strip_punctuation(word):
    """Remove leading and trailing punctuation from a word."""
    start = 0
    end = len(word)
    while start < end and word[start] in PUNCTUATION:
        start += 1
    while end > start and word[end - 1] in PUNCTUATION:
        end -= 1
    return word[start:end]


def normalize_token(word):
    """Lowercase a word and strip its surrounding punctuation."""
    return strip_punctuation(word.lower())


def is_stopword(token):
    """Whether a normalised token is a common stopword."""
    return token in STOPWORDS


def tokenize(text):
    """Split text on whitespace into a list of normalised, non-empty tokens."""
    tokens = []
    for raw in text.split():
        token = normalize_token(raw)
        if token:
            tokens.append(token)
    return tokens


def tokenize_dropping_stopwords(text):
    """Tokenize text, discarding any token that is a stopword."""
    kept = []
    for token in tokenize(text):
        if is_stopword(token):
            continue
        kept.append(token)
    return kept
