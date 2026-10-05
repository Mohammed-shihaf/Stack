"""Magnitude and normalisation."""

import math
from typing import Sequence, Tuple

from vectorlite.ops import dot, scale


def magnitude(vector: Sequence[float]) -> float:
    """Euclidean length of a vector."""
    return math.sqrt(dot(vector, vector))


def normalise(vector: Sequence[float]) -> Tuple[float, ...]:
    """Unit vector in the same direction; the zero vector is returned as-is."""
    length = magnitude(vector)
    if length == 0.0:
        return tuple(vector)
    return scale(vector, 1.0 / length)
