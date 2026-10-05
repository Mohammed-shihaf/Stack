"""Discovery of ``{{name}}`` placeholders in a template."""


from typing import List
import re

PLACEHOLDER_PATTERN = re.compile(r"\{\{([a-z_][a-z0-9_]*)\}\}")


def placeholders_in(template: str) -> List[str]:
    """Placeholder names appearing in a template, in order, deduplicated."""
    seen: List[str] = []
    for match in PLACEHOLDER_PATTERN.finditer(template):
        name = match.group(1)
        if name not in seen:
            seen.append(name)
    return seen
