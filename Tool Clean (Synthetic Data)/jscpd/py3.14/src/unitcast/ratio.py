"""Temperature conversion as an offset pair, with no table involved."""

KELVIN_OFFSET = 273.15


def celsius_to_kelvin(celsius: float) -> float:
    """Shift a Celsius reading onto the Kelvin scale."""
    return celsius + KELVIN_OFFSET


def kelvin_to_celsius(kelvin: float) -> float:
    """Shift a Kelvin reading onto the Celsius scale."""
    return kelvin - KELVIN_OFFSET
