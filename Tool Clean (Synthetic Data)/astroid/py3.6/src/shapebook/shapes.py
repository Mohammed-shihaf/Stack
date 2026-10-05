"""Concrete shape types with statically known attributes."""

import math


class Shape:
    """Base shape carrying only a label."""

    def __init__(self, label):
        self.label = label

    def area(self):
        """Area of the shape; the base shape encloses nothing."""
        return 0.0


class Rectangle(Shape):
    """An axis-aligned rectangle."""

    def __init__(self, label, width, height):
        super().__init__(label)
        self.width = width
        self.height = height

    def area(self):
        """Width times height."""
        return self.width * self.height


class Circle(Shape):
    """A circle given by its radius."""

    def __init__(self, label, radius):
        super().__init__(label)
        self.radius = radius

    def area(self):
        """Pi r squared."""
        return math.pi * self.radius * self.radius
