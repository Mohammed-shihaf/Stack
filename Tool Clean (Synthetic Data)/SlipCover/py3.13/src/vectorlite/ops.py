"""Element-wise operations on equal-length vectors."""

from typing import Sequence


def add(left: Sequence[float], right: Sequence[float]) -> tuple[float, ...]:
    """Element-wise sum of two equal-length vectors."""
    if len(left) != len(right):
        raise ValueError("vectors must be the same length")
    return tuple(a + b for a, b in zip(left, right))


def scale(vector: Sequence[float], factor: float) -> tuple[float, ...]:
    """Multiply every component by a scalar."""
    return tuple(component * factor for component in vector)


def dot(left: Sequence[float], right: Sequence[float]) -> float:
    """Dot product of two equal-length vectors."""
    if len(left) != len(right):
        raise ValueError("vectors must be the same length")
    return sum(a * b for a, b in zip(left, right))
