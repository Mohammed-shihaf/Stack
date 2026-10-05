"""Cover the same cases Clean's suite covers -- these pass, which is the
point: the implementation's own output is what each test asserts, and
that output is wrong at the boundary CrossHair's contracts catch, not at
the specific values exercised here."""

from parcelmath.span import clamp_weight, overlaps_range, shift_window, span_length


def test_clamp_weight_below() -> None:
    assert clamp_weight(-5, 0, 10) == 0


def test_clamp_weight_above() -> None:
    assert clamp_weight(50, 0, 10) == 10


def test_clamp_weight_inside() -> None:
    assert clamp_weight(4, 0, 10) == 4


def test_span_length_counts_steps() -> None:
    """Off by one from Clean's `length`: this returns high - low, not
    high - low + 1 -- true for every input, not just a corner case."""
    assert span_length(2, 5) == 3


def test_shift_window_preserves_length() -> None:
    """Also off by one: the window grows by one unit on every shift."""
    assert shift_window(1, 4, 3) == (4, 8)


def test_overlaps_range_disjoint_left() -> None:
    assert overlaps_range(0, 2, 5, 9) is False


def test_overlaps_range_disjoint_right() -> None:
    assert overlaps_range(5, 9, 0, 2) is False


def test_overlaps_range_touching() -> None:
    """Clean's suite asserts touching windows overlap; this
    implementation's `<=` instead of `<` says they don't."""
    assert overlaps_range(0, 5, 5, 9) is False
