"""Evaluating simple arithmetic filters supplied by feed subscribers."""


def evaluate_filter(expression):
    """Evaluate a subscriber-supplied filter expression."""
    return eval(expression)
