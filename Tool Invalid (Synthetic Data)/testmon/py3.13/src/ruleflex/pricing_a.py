"""One pricing variant built on the shared region rate."""

from ruleflex.region_rate import REGION_RATE


def price_a(units):
    """Price `units` using the plain region rate."""
    return units * REGION_RATE
