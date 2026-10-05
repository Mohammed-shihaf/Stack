"""Per-zone surcharges in whole cents."""

SURCHARGE_CENTS = {
    "metro": 0,
    "regional": 450,
    "national": 1200,
    "remote": 2750,
}


def band_surcharge(zone: str) -> int:
    """Surcharge in cents for a named zone; unknown zones cost nothing."""
    return SURCHARGE_CENTS.get(zone, 0)
