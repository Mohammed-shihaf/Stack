"""Exercise normalisation and slug construction."""

from slugsmith import collapse_spaces, make_slug, strip_accents


def test_strip_accents() -> None:
    assert strip_accents("Ce\u0301sar") == "Cesar"


def test_collapse_spaces() -> None:
    assert collapse_spaces("  a   b  ") == "a b"


def test_make_slug_basic() -> None:
    assert make_slug("Hello, World!") == "hello-world"


def test_make_slug_trims_to_max_length() -> None:
    assert len(make_slug("w " * 80)) <= 60
