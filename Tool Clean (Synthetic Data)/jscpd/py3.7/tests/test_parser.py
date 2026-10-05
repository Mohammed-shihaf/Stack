"""Duration parsing, including both failure paths."""

import pytest

from unitcast import parse_duration_seconds


def test_parses_compound_duration() -> None:
    assert parse_duration_seconds("1h30m") == 5400


def test_rejects_unknown_character() -> None:
    with pytest.raises(ValueError):
        parse_duration_seconds("1x")


def test_rejects_trailing_digits() -> None:
    with pytest.raises(ValueError):
        parse_duration_seconds("90")
