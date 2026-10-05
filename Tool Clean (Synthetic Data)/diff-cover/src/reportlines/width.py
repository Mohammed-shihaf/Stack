"""Fitting text into a fixed column width."""

ELLIPSIS = "..."


def fit_to_width(text: str, width: int) -> str:
    """Trim text to `width` columns, marking truncation with an ellipsis."""
    if len(text) <= width:
        return text
    if width <= len(ELLIPSIS):
        return text[:width]
    return text[: width - len(ELLIPSIS)] + ELLIPSIS


def pad_to_width(text: str, width: int) -> str:
    """Pad text with spaces up to `width`, leaving longer text untouched."""
    if len(text) >= width:
        return text
    return text + " " * (width - len(text))
