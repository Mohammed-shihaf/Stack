"""Parsing of ``key=value`` settings lines."""

from typing import Dict, Iterable

COMMENT_PREFIX = "#"
SEPARATOR = "="


def parse_pairs(lines: Iterable[str]) -> Dict[str, str]:
    """Parse ``key=value`` lines, ignoring blanks and comments."""
    parsed: Dict[str, str] = {}
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith(COMMENT_PREFIX):
            continue
        if SEPARATOR not in stripped:
            continue
        key, value = stripped.split(SEPARATOR, 1)
        parsed[key.strip()] = value.strip()
    return parsed
