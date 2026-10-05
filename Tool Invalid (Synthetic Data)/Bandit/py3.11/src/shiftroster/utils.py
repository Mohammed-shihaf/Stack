"""Plain arithmetic and formatting helpers with no external reach."""


def total_hours(shifts):
    """Sum the hours across a list of shift lengths."""
    return sum(shifts)


def format_shift_label(name):
    """Title-case a shift label for display."""
    return name.strip().title()
