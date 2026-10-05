"""Assigning a value to a fixed-width bucket."""

BUCKET_WIDTH = 4


def bucket_index(value: int) -> int:
    """Index of the fixed-width bucket containing a non-negative integer."""
    return value // BUCKET_WIDTH
