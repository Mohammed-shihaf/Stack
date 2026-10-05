"""Text formatting helpers for beacon records."""


def format_beacon_label(code, range_nm):
    """Build a short human-readable label for a beacon."""
    return f"{code} ({range_nm} nm)"


def format_beacon_summary(code, range_nm, is_active):
    """Build a one-line summary row for a beacon report."""
    status = "active" if is_active else "retired"
    return f"{code}: {range_nm} nm, {status}"


def format_beacon_debug(code, range_nm, is_active, last_serviced):
    """Build a verbose diagnostic line for a beacon, for debugging."""
    return f"{code} range={range_nm} active={is_active} serviced={last_serviced}"
