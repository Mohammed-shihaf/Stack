"""Build a hyphenated slug from arbitrary text."""

from slugsmith.normalise import ALLOWED, collapse_spaces, strip_accents

MAX_LENGTH = 60


def make_slug(text: str) -> str:
    """Lowercase, accent-free, hyphen-joined slug of bounded length."""
    plain = strip_accents(text).lower()
    kept = "".join(ch for ch in plain if ch in ALLOWED)
    words = collapse_spaces(kept).replace("-", " ").split()
    slug = "-".join(words)
    return slug[:MAX_LENGTH].rstrip("-")
