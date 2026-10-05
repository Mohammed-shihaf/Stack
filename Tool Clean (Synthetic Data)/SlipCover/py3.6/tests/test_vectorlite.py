"""Cover every operation, both error paths and the zero-vector branch."""

import pytest

from vectorlite import add, dot, magnitude, normalise, scale


def test_add() -> None:
    assert add((1.0, 2.0), (3.0, 4.0)) == (4.0, 6.0)


def test_add_rejects_mismatched_lengths() -> None:
    with pytest.raises(ValueError):
        add((1.0,), (1.0, 2.0))


def test_scale() -> None:
    assert scale((1.0, -2.0), 3.0) == (3.0, -6.0)


def test_dot() -> None:
    assert dot((1.0, 2.0), (3.0, 4.0)) == 11.0


def test_dot_rejects_mismatched_lengths() -> None:
    with pytest.raises(ValueError):
        dot((1.0,), (1.0, 2.0))


def test_magnitude() -> None:
    assert magnitude((3.0, 4.0)) == 5.0


def test_normalise_unit_length() -> None:
    assert normalise((3.0, 4.0)) == pytest.approx((0.6, 0.8))


def test_normalise_zero_vector_is_unchanged() -> None:
    assert normalise((0.0, 0.0)) == (0.0, 0.0)
