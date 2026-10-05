"""Both arms of every conversion branch."""

from thermo import to_celsius, to_fahrenheit
from thermo.convert import ABSOLUTE_ZERO_C


def test_to_fahrenheit_normal() -> None:
    assert to_fahrenheit(100.0) == 212.0


def test_to_fahrenheit_clamps_below_absolute_zero() -> None:
    assert to_fahrenheit(-300.0) == to_fahrenheit(ABSOLUTE_ZERO_C)


def test_to_celsius_normal() -> None:
    assert to_celsius(32.0) == 0.0


def test_to_celsius_clamps_below_absolute_zero() -> None:
    assert to_celsius(-500.0) == ABSOLUTE_ZERO_C
