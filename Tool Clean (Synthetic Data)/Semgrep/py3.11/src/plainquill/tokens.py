"""Discovery of ``{{name}}`` placeholders in a template."""

import re

PLACEHOLDER_PATTERN = re.compile(r"\{\{([a-z_][a-z0-9_]*)\}\}")


def placeholders_in(template: str) -> list[str]:
    """Placeholder names appearing in a template, in order, deduplicated."""
    seen: list[str] = []
    for match in PLACEHOLDER_PATTERN.finditer(template):
        name = match.group(1)
        if name not in seen:
            seen.append(name)
    return seen
