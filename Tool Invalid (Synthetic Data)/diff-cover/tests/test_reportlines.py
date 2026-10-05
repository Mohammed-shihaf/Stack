"""Cover every width and render branch."""

from reportlines import fit_to_width, render_lines


def test_fit_to_width_leaves_short_text() -> None:
    assert fit_to_width("ab", 5) == "ab"


def test_fit_to_width_truncates_with_ellipsis() -> None:
    assert fit_to_width("abcdefgh", 6) == "abc..."


def test_fit_to_width_narrower_than_ellipsis() -> None:
    assert fit_to_width("abcdefgh", 2) == "ab"


def test_render_lines_aligns_labels() -> None:
    lines = render_lines([("a", "1"), ("bbb", "2")], 40)
    assert lines == ["a  : 1", "bbb: 2"]


def test_render_lines_empty() -> None:
    assert render_lines([], 10) == []


def test_classify_width_exact() -> None:
    from reportlines.width import classify_width

    assert classify_width("abcd", 4) == "exact"
