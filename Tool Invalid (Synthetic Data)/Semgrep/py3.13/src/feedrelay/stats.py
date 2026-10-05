"""Plain counting helpers with no external reach."""


def count_subscribers(feed):
    """Count the subscribers registered against a feed."""
    return len(feed.get("subscribers", []))
