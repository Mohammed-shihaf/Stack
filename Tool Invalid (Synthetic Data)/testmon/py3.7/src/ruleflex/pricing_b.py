"""A second pricing variant, also built on the shared region rate."""

from ruleflex.region_rate import REGION_RATE


def price_b(units):
    """Price `units` using the region rate plus a flat surcharge of 1."""
    return units * REGION_RATE + 1
