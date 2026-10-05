"""Rendering by explicit replacement, never by evaluation."""


from typing import Dict
from plainquill.tokens import PLACEHOLDER_PATTERN, placeholders_in


def render(template: str, values: Dict[str, str]) -> str:
    """Replace known placeholders with their values, leaving unknowns intact."""
    rendered = template
    for name in placeholders_in(template):
        if name not in values:
            continue
        rendered = rendered.replace("{{" + name + "}}", values[name])
    return rendered
