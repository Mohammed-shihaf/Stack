"""Plain-language bands for a Celsius reading."""

FREEZING_C = 0.0
MILD_C = 18.0
WARM_C = 27.0


def describe_band(celsius: float) -> str:
    """Name the band a Celsius reading falls into."""
    if celsius < FREEZING_C:
        return "freezing"
    if celsius < MILD_C:
        return "cool"
    if celsius < WARM_C:
        return "mild"
    return "warm"
