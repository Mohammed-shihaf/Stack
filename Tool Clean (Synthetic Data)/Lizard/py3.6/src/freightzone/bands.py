"""Distance bands mapped to named freight zones."""

ZONE_BANDS = (
    (80, "metro"),
    (400, "regional"),
    (1600, "national"),
)
REMOTE_ZONE = "remote"


def zone_for_distance(kilometres: int) -> str:
    """Name the freight zone covering a distance in kilometres."""
    for limit, zone in ZONE_BANDS:
        if kilometres <= limit:
            return zone
    return REMOTE_ZONE
