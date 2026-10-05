"""Precomputed neighbour offsets, so lookups need no nested loops."""

ORTHOGONAL = ((-1, 0), (1, 0), (0, -1), (0, 1))

SURROUNDING = (
    (-1, -1), (-1, 0), (-1, 1),
    (0, -1), (0, 1),
    (1, -1), (1, 0), (1, 1),
)
