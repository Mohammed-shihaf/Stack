"""Formatting a grouped section of release notes."""

from typing import Sequence

BULLET = "- "


def format_section(heading: str, summaries: Sequence[str]) -> str:
    """Render a heading and its bulleted summaries as one block of text."""
    if not summaries:
        return f"## {heading}\n\n(nothing recorded)"
    bullets = "\n".join(BULLET + summary for summary in summaries)
    return f"## {heading}\n\n{bullets}"
