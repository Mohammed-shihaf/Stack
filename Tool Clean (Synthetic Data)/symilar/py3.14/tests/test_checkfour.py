"""Both outcomes of all four validators."""

from checkfour import (
    has_valid_checksum,
    is_known_region,
    is_valid_postcode,
    is_within_reading_range,
)


def test_postcode() -> None:
    assert is_valid_postcode("AB12-345") is True
    assert is_valid_postcode("ab12-345") is False


def test_checksum() -> None:
    assert has_valid_checksum("0000") is True
    assert has_valid_checksum("0001") is False
    assert has_valid_checksum("12x4") is False


def test_region() -> None:
    assert is_known_region("North") is True
    assert is_known_region("orbital") is False


def test_reading_range() -> None:
    assert is_within_reading_range(20.0) is True
    assert is_within_reading_range(120.0) is False
