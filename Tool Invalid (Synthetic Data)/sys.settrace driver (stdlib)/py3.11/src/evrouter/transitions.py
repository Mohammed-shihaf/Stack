"""A small state transition table for a record lifecycle."""

TRANSITIONS = {
    ("draft", "submit"): "pending",
    ("pending", "approve"): "active",
    ("pending", "reject"): "draft",
    ("active", "archive"): "archived",
    ("archived", "restore"): "active",
}


def next_state(state, action):
    """The state reached by applying an action to a state, or None if invalid."""
    return TRANSITIONS.get((state, action))


def is_valid_transition(state, action):
    """Whether a (state, action) pair has a defined transition."""
    return (state, action) in TRANSITIONS


def terminal_states():
    """States that no transition in the table ever leaves."""
    sources = {pair[0] for pair in TRANSITIONS}
    targets = set(TRANSITIONS.values())
    return targets - sources
