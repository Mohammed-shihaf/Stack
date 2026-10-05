"""Conversions between Celsius and Fahrenheit."""

ABSOLUTE_ZERO_C = -273.15


def to_fahrenheit(celsius: float) -> float:
    """Convert Celsius to Fahrenheit, clamped at absolute zero."""
    if celsius < ABSOLUTE_ZERO_C:
        return to_fahrenheit(ABSOLUTE_ZERO_C)
    return celsius * 9.0 / 5.0 + 32.0


def to_celsius(fahrenheit: float) -> float:
    """Convert Fahrenheit to Celsius, clamped at absolute zero."""
    celsius = (fahrenheit - 32.0) * 5.0 / 9.0
    if celsius < ABSOLUTE_ZERO_C:
        return ABSOLUTE_ZERO_C
    return celsius
