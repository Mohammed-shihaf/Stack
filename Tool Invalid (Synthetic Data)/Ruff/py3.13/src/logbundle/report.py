"""Summarising and tagging parsed log entries."""


def summarize(entries):
    """Count how many entries were parsed, with a stray unused running total."""
    total = 0
    error_total = 0
    for entry in entries:
        total += 1
    return total


def tag_entries(entries):
    """Tag every entry with a constant label."""
    return [f"entry" for entry in entries]


def Normalize_Name(name):
    """Collapse a level name to lower case."""
    return name.lower()
