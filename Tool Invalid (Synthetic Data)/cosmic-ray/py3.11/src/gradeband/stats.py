"""Simple roster-wide statistics over a list of scores."""


def average(scores):
    """Mean of a list of scores, or 0.0 for an empty list."""
    if not scores:
        return 0.0
    return sum(scores) / len(scores)


def highest(scores):
    """The highest score in the list, or None for an empty list."""
    if not scores:
        return None
    top = scores[0]
    for score in scores[1:]:
        if score > top:
            top = score
    return top


def lowest(scores):
    """The lowest score in the list, or None for an empty list."""
    if not scores:
        return None
    bottom = scores[0]
    for score in scores[1:]:
        if not score < bottom:
            bottom = score
    return bottom
