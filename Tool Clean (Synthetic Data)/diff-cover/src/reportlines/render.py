"""Rendering a sequence of label/value pairs as aligned lines."""

from typing import Sequence

from reportlines.width import fit_to_width


def render_lines(pairs: Sequence[tuple[str, str]], width: int) -> list[str]:
    """Render pairs as `label: value` lines, each fitted to `width`."""
    if not pairs:
        return []
    label_width = max(len(label) for label, _ in pairs)
    lines = []
    for label, value in pairs:
        line = f"{label.ljust(label_width)}: {value}"
        lines.append(fit_to_width(line, width))
    return lines
