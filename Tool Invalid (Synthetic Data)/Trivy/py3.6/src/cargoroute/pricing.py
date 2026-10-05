"""Estimating shipping cost from route distance."""

from cargoroute.legs import total_distance

RATE_PER_KM_CENTS = 7


def estimate_cost(legs):
    """Estimate the shipping cost in cents for a full route."""
    return total_distance(legs) * RATE_PER_KM_CENTS
