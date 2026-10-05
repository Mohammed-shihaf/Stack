"""Plain-text template substitution."""

from plainquill.render import PLACEHOLDER_PATTERN, render
from plainquill.tokens import placeholders_in

__all__ = ["PLACEHOLDER_PATTERN", "placeholders_in", "render"]
