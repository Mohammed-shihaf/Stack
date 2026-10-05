"""Cover every parse branch and the merge precedence."""

from tidyconf import Layer, merge_layers, parse_pairs


def test_parse_pairs_reads_values() -> None:
    """Well-formed lines parse, with surrounding space trimmed."""
    assert parse_pairs(["a=1", "b = 2"]) == {"a": "1", "b": "2"}


def test_parse_pairs_skips_blanks_and_comments() -> None:
    """Blank lines and comments contribute nothing."""
    assert parse_pairs(["", "  ", "# note"]) == {}


def test_parse_pairs_skips_lines_without_separator() -> None:
    """A line with no separator is ignored rather than raising."""
    assert parse_pairs(["plain"]) == {}


def test_merge_layers_later_wins() -> None:
    """A later layer overrides an earlier one key by key."""
    base = Layer("base", {"mode": "safe", "retries": "1"})
    override = Layer("env", {"mode": "fast"})
    assert merge_layers([base, override]) == {"mode": "fast", "retries": "1"}


def test_merge_layers_empty() -> None:
    """Merging nothing yields an empty mapping."""
    assert merge_layers([]) == {}
