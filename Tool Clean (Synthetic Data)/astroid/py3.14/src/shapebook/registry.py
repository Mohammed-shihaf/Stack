"""Aggregation over a sequence of shapes."""

from typing import Sequence

from shapebook.shapes import Shape


def total_area(shapes: Sequence[Shape]) -> float:
    """Sum of the areas of every shape in the sequence."""
    return sum(shape.area() for shape in shapes)
