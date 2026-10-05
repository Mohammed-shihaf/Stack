"""Exhaustive over every word and position in the domain."""

import pytest

from flagset import ALL_FLAGS, WIDTH, clear, is_set, toggle

WORDS = range(ALL_FLAGS + 1)
POSITIONS = range(WIDTH)


def test_domain_constants() -> None:
    assert WIDTH == 4
    assert ALL_FLAGS == 15


@pytest.mark.parametrize("word", WORDS)
@pytest.mark.parametrize("position", POSITIONS)
def test_is_set_matches_shift(word: int, position: int) -> None:
    expected = bool(word // (2 ** position) % 2)
    assert is_set(word, position) is expected


@pytest.mark.parametrize("word", WORDS)
@pytest.mark.parametrize("position", POSITIONS)
def test_toggle_flips_exactly_one_bit(word: int, position: int) -> None:
    flipped = toggle(word, position)
    assert is_set(flipped, position) is not is_set(word, position)
    others = [p for p in POSITIONS if p != position]
    assert all(is_set(flipped, p) is is_set(word, p) for p in others)


@pytest.mark.parametrize("word", WORDS)
@pytest.mark.parametrize("position", POSITIONS)
def test_clear_unsets_and_preserves(word: int, position: int) -> None:
    cleared = clear(word, position)
    assert is_set(cleared, position) is False
    others = [p for p in POSITIONS if p != position]
    assert all(is_set(cleared, p) is is_set(word, p) for p in others)
