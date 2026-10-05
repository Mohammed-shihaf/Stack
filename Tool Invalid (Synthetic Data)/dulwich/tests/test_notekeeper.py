"""Cover grouping and both formatting branches."""

from notekeeper import Note, format_section, group_by_kind


def test_group_by_kind_preserves_order() -> None:
    notes = [Note("fixed", "a"), Note("added", "b"), Note("fixed", "c")]
    assert group_by_kind(notes) == {"fixed": ["a", "c"], "added": ["b"]}


def test_format_section_with_summaries() -> None:
    text = format_section("Fixed", ["a", "b"])
    assert text == "## Fixed\n\n- a\n- b"


def test_format_section_without_summaries() -> None:
    assert format_section("Fixed", []) == "## Fixed\n\n(nothing recorded)"
