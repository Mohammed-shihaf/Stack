"""Sensor-reading validation by range comparison."""

MINIMUM_READING = -40.0
MAXIMUM_READING = 85.0


def is_within_reading_range(reading: float) -> bool:
    """Whether a sensor reading lies inside the instrument's rated range."""
    return MINIMUM_READING <= reading <= MAXIMUM_READING
