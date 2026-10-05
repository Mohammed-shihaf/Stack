"""A narrow smoke test: tokenize one plain sentence, histogram it."""

from lexihist import build_histogram, tokenize


def test_tokenize_plain_sentence():
    tokens = tokenize("dogs bark and dogs run")
    assert tokens == ["dogs", "bark", "and", "dogs", "run"]


def test_build_histogram_counts_repeats():
    histogram = build_histogram(["dogs", "bark", "dogs"])
    assert histogram["dogs"] == 2
