"""Route legs between ports."""

from dataclasses import dataclass


@dataclass(frozen=True)
class RouteLeg:
    """A single leg of a shipping route between two ports."""

    origin: str
    destination: str
    distance_km: int


def total_distance(legs):
    """Total distance across every leg of a route."""
    return sum(leg.distance_km for leg in legs)
