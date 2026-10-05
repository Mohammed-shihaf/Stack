"""Parsing of ``key=value`` settings lines."""

from collections.abc import Iterable

COMMENT_PREFIX = "#"
SEPARATOR = "="


def parse_pairs(lines: Iterable[str]) -> dict[str, str]:
    """Parse ``key=value`` lines, ignoring blanks and comments."""
    parsed: dict[str, str] = {}
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith(COMMENT_PREFIX):
            continue
        if SEPARATOR not in stripped:
            continue
        key, value = stripped.split(SEPARATOR, 1)
        parsed[key.strip()] = value.strip()
    return parsed
