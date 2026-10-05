"""Exhaustive expected values, written as a literal table."""

import pytest

from roundkit import STEP, bucket_index, round_to_step

ROUNDED = [
    0, 0, 0, 5, 5, 5, 5, 5, 10, 10,
    10, 10, 10, 15, 15, 15, 15, 15, 20, 20, 20,
]
BUCKETS = [
    0, 0, 0, 0, 1, 1, 1, 1, 2, 2,
    2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5,
]


def test_step_constant() -> None:
    assert STEP == 5


@pytest.mark.parametrize("value", range(len(ROUNDED)))
def test_round_to_step(value: int) -> None:
    assert round_to_step(value) == ROUNDED[value]


@pytest.mark.parametrize("value", range(len(BUCKETS)))
def test_bucket_index(value: int) -> None:
    assert bucket_index(value) == BUCKETS[value]
