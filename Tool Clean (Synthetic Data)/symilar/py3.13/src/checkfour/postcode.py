"""Postcode validation by regular expression."""

import re

POSTCODE_PATTERN = re.compile(r"^[A-Z]{2}\d{2}-\d{3}$")


def is_valid_postcode(candidate: str) -> bool:
    """Whether a candidate matches the two-letter, four-digit postcode form."""
    return POSTCODE_PATTERN.match(candidate) is not None
