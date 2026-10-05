"""Rendering subscriber notification templates."""


def render_notice(template, values):
    """Render a notification template against subscriber-supplied values."""
    return template.format(**values)
