"""Temperature offsets, both directions."""

from unitcast import celsius_to_kelvin, kelvin_to_celsius


def test_celsius_to_kelvin() -> None:
    assert celsius_to_kelvin(0.0) == 273.15


def test_kelvin_to_celsius() -> None:
    assert kelvin_to_celsius(273.15) == 0.0
