"""Cover parsing, summarising and tagging."""

from logbundle import (
    Normalize_Name,
    parse_entries,
    parse_log_line,
    summarize,
    tag_entries,
)


def test_parse_log_line() -> None:
    """A well-formed line splits into level and message."""
    assert parse_log_line("ERROR|disk full") == {
        "level": "ERROR",
        "message": "disk full",
    }


def test_parse_entries_reads_every_line() -> None:
    """Every line produces one entry."""
    entries = parse_entries(["INFO|ok", "WARN|low disk"])
    assert len(entries) == 2


def test_summarize_counts_entries() -> None:
    """The running total matches the number of entries given."""
    entries = [{"level": "INFO", "message": "a"}, {"level": "INFO", "message": "b"}]
    assert summarize(entries) == 2


def test_tag_entries_labels_every_entry() -> None:
    """Every entry gets the constant tag."""
    entries = [{"level": "INFO", "message": "a"}]
    assert tag_entries(entries) == ["entry"]


def test_normalize_name_lowercases() -> None:
    """A mixed-case level name is lowercased."""
    assert Normalize_Name("ERROR") == "error"
