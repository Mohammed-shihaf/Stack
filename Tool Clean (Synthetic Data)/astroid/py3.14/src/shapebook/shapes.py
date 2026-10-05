"""Concrete shape types with statically known attributes."""

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class Shape:
    """Base shape carrying only a label."""

    label: str

    def area(self) -> float:
        """Area of the shape; the base shape encloses nothing."""
        return 0.0


@dataclass(frozen=True)
class Rectangle(Shape):
    """An axis-aligned rectangle."""

    width: float
    height: float

    def area(self) -> float:
        """Width times height."""
        return self.width * self.height


@dataclass(frozen=True)
class Circle(Shape):
    """A circle given by its radius."""

    radius: float

    def area(self) -> float:
        """Pi r squared."""
        return math.pi * self.radius * self.radius
