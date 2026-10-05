"""Cover both arms of every interval branch."""

from spanmath import clamp, length, overlaps, shift


def test_clamp_below() -> None:
    assert clamp(-5, 0, 10) == 0


def test_clamp_above() -> None:
    assert clamp(50, 0, 10) == 10


def test_clamp_inside() -> None:
    assert clamp(4, 0, 10) == 4


def test_length_counts_endpoints() -> None:
    assert length(2, 5) == 4


def test_shift_preserves_length() -> None:
    assert shift(1, 4, 3) == (4, 7)


def test_overlaps_disjoint_left() -> None:
    assert overlaps(0, 2, 5, 9) is False


def test_overlaps_disjoint_right() -> None:
    assert overlaps(5, 9, 0, 2) is False


def test_overlaps_touching() -> None:
    assert overlaps(0, 5, 5, 9) is True
