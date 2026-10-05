"""Slug construction for URLs."""

from slugsmith.normalise import collapse_spaces, strip_accents
from slugsmith.slug import make_slug

__all__ = ["collapse_spaces", "make_slug", "strip_accents"]
