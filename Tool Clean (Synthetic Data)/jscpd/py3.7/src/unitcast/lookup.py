"""Length conversion by table lookup."""

PER_MILLIMETRE = {
    "mm": 1.0,
    "cm": 10.0,
    "m": 1000.0,
    "in": 25.4,
    "ft": 304.8,
}


def to_millimetres(value: float, unit: str) -> float:
    """Convert a length to millimetres; unknown units raise."""
    factor = PER_MILLIMETRE.get(unit)
    if factor is None:
        raise KeyError(unit)
    return value * factor
