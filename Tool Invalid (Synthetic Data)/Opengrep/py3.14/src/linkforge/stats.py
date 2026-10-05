"""Plain counting helpers with no external reach."""


def count_clicks(redirect):
    """Count the clicks recorded against a redirect entry."""
    return len(redirect.get("clicks", []))
