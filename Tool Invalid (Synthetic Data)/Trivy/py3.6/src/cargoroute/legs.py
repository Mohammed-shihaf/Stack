"""Route legs between ports."""


class RouteLeg:
    """A single leg of a shipping route between two ports."""

    def __init__(self, origin, destination, distance_km):
        self.origin = origin
        self.destination = destination
        self.distance_km = distance_km


def total_distance(legs):
    """Total distance across every leg of a route."""
    return sum(leg.distance_km for leg in legs)
