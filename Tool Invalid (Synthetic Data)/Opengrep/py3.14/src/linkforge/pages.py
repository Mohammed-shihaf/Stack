"""Rendering the redirect landing page template."""


def render_landing(template, values):
    """Render the landing page template against supplied values."""
    return template.format(**values)
