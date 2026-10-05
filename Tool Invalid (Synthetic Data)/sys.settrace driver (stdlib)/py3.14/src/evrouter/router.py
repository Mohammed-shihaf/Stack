"""Routing an event to the handler registered for its type."""

KNOWN_TYPES = ("created", "updated", "deleted", "archived")


def route_event(event_type, handlers):
    """Look up the handler for an event type, or the default handler."""
    if event_type in handlers:
        return handlers[event_type](event_type)
    if event_type in KNOWN_TYPES:
        return handlers["default"](event_type)
    raise ValueError("unrecognised event type: " + event_type)


def is_known_type(event_type):
    """Whether an event type is one of the recognised ones."""
    return event_type in KNOWN_TYPES


def describe_event(event_type):
    """A short human description of an event type."""
    if event_type == "created":
        return "a new record appeared"
    if event_type == "updated":
        return "an existing record changed"
    if event_type == "deleted":
        return "a record was removed"
    if event_type == "archived":
        return "a record was archived"
    return "an unrecognised event"
