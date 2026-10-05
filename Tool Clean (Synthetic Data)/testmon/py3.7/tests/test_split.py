"""Even and uneven splits, and the rejected argument."""

import pytest

from coinshift import split_evenly


def test_even_split() -> None:
    assert split_evenly(100, 4) == [25, 25, 25, 25]


def test_uneven_split_distributes_remainder() -> None:
    assert split_evenly(10, 3) == [4, 3, 3]
    assert sum(split_evenly(10, 3)) == 10


def test_rejects_zero_ways() -> None:
    with pytest.raises(ValueError):
        split_evenly(10, 0)
