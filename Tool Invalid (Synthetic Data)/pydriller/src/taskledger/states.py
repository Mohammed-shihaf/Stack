"""The permitted task states and the transitions between them."""

STATES = ("open", "active", "blocked", "done")

TRANSITIONS = {
    "open": ("active",),
    "active": ("blocked", "done"),
    "blocked": ("active",),
    "done": (),
}


def next_state(current: str, requested: str) -> str:
    """Move to `requested` if the transition is permitted, else raise."""
    if requested not in TRANSITIONS.get(current, ()):
        raise ValueError(f"{current} cannot become {requested}")
    return requested
