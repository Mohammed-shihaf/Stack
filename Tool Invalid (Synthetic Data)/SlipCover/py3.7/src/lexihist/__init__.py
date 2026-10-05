"""Tokenizing plain text and summarising it as a word-frequency histogram."""

from lexihist.histogram import build_histogram
from lexihist.tokenize import tokenize

__all__ = ["build_histogram", "tokenize"]
