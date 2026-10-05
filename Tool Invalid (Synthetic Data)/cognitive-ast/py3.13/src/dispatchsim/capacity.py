"""Carrier headroom, left as a flat arithmetic check."""


def carrier_headroom(capacity_units, committed_units):
    """Remaining carrier capacity; never negative."""
    remaining = capacity_units - committed_units
    return remaining if remaining > 0 else 0
