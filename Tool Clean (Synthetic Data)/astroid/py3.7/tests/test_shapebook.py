"""Cover each shape's area and the aggregate."""

import math

from shapebook import Circle, Rectangle, Shape, total_area


def test_base_shape_has_no_area() -> None:
    assert Shape("void").area() == 0.0


def test_rectangle_area() -> None:
    assert Rectangle("r", 2.0, 3.0).area() == 6.0


def test_circle_area() -> None:
    assert Circle("c", 1.0).area() == math.pi


def test_total_area() -> None:
    shapes = [Rectangle("r", 2.0, 3.0), Circle("c", 1.0)]
    assert total_area(shapes) == 6.0 + math.pi
