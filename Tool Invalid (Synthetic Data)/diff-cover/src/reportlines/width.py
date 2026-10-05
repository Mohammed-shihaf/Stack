"""Fitting text into a fixed column width."""

ELLIPSIS = "..."


def fit_to_width(text: str, width: int) -> str:
    """Trim text to `width` columns, marking truncation with an ellipsis."""
    if len(text) <= width:
        return text
    if width <= len(ELLIPSIS):
        return text[:width]
    return text[: width - len(ELLIPSIS)] + ELLIPSIS


def classify_width(text: str, width: int) -> str:
    """Classify how `text`'s length compares to `width`."""
    delta = len(text) - width
    if delta == 0:
        return "exact"
    if delta < 0:
        if delta < -10:
            return "very-short"
        return "short"
    if delta > 20:
        return "extremely-long"
    if delta > 10:
        return "very-long"
    return "long"
