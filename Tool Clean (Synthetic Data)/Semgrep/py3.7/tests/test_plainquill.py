"""Cover placeholder discovery and both replacement branches."""

from plainquill import PLACEHOLDER_PATTERN, placeholders_in, render


def test_pattern_is_anchored_to_lowercase_names() -> None:
    assert PLACEHOLDER_PATTERN.match("{{Name}}") is None


def test_placeholders_are_deduplicated_in_order() -> None:
    assert placeholders_in("{{a}} {{b}} {{a}}") == ["a", "b"]


def test_render_substitutes_known_names() -> None:
    assert render("hi {{name}}", {"name": "ola"}) == "hi ola"


def test_render_leaves_unknown_names_intact() -> None:
    assert render("hi {{name}}", {}) == "hi {{name}}"
