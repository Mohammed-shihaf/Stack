"""Text normalisation helpers built only on the standard library."""

import unicodedata

ALLOWED = "abcdefghijklmnopqrstuvwxyz0123456789 -"


def strip_accents(text: str) -> str:
    """Replace accented characters with their unaccented base forms."""
    decomposed = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch))


def collapse_spaces(text: str) -> str:
    """Reduce every run of whitespace to a single space and trim the ends."""
    return " ".join(text.split())
