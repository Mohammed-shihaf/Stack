"""Every band, including both edges."""

import pytest

from thermo import describe_band


@pytest.mark.parametrize(
    ("celsius", "band"),
    [(-4.0, "freezing"), (10.0, "cool"), (20.0, "mild"), (31.0, "warm")],
)
def test_describe_band(celsius: float, band: str) -> None:
    assert describe_band(celsius) == band
