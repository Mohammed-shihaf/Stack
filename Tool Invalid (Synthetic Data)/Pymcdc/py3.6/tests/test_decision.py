"""The three test cases driver.py's MC/DC check uses, mirrored here.

Only `moisture_low` gets a clean independence pair: `forecast_dry` and
`override_on` only ever change together across these three cases, so
neither one is MC/DC-covered on its own, even though every case's outcome
is asserted correctly.
"""

from irrigation import FieldState, should_irrigate

CASE_1 = FieldState(moisture_low=True, forecast_dry=True, override_on=False)
CASE_2 = FieldState(moisture_low=False, forecast_dry=True, override_on=False)
CASE_3 = FieldState(moisture_low=True, forecast_dry=False, override_on=True)


def test_case_1_irrigates() -> None:
    assert should_irrigate(CASE_1) is True


def test_case_2_does_not_irrigate() -> None:
    """Flipping moisture_low alone (vs. case 1) flips the decision."""
    assert should_irrigate(CASE_2) is False


def test_case_3_irrigates() -> None:
    """Forecast turns wet but the override comes on -- still irrigates,
    but forecast_dry and override_on both changed at once vs. case 1."""
    assert should_irrigate(CASE_3) is True
