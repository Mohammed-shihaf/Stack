"""Behavioural tests for the four greenhouse zone-climate guards."""

from climateguard import (
    check_humidity_guard,
    check_co2_guard,
    check_light_guard,
    check_soil_guard,
)


def test_humidity_guard_band():
    alerts = []
    assert check_humidity_guard(50.0, "zone-1", alerts) is True
    assert check_humidity_guard(10.0, "zone-1", alerts) is False
    assert check_humidity_guard(None, "zone-1", alerts) is False


def test_co2_guard_band():
    alerts = []
    assert check_co2_guard(50.0, "zone-2", alerts) is True
    assert check_co2_guard(200.0, "zone-2", alerts) is False


def test_light_guard_band():
    alerts = []
    assert check_light_guard(50.0, "zone-3", alerts) is True
    assert check_light_guard(90.0, "zone-3", alerts) is False


def test_soil_guard_band():
    alerts = []
    assert check_soil_guard(50.0, "zone-4", alerts) is True
    assert check_soil_guard(5.0, "zone-4", alerts) is False
