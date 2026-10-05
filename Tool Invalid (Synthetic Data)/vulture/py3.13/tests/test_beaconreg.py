"""Tests for the beacon registry and its label formatting."""

from beaconreg import BeaconRegistry, register_beacon, list_active_beacons, format_beacon_label


def test_register_and_label():
    registry = BeaconRegistry()
    label = register_beacon(registry, "ALPHA-1", 18, is_active=True)
    assert label == format_beacon_label("ALPHA-1", 18)


def test_list_active_beacons():
    registry = BeaconRegistry()
    register_beacon(registry, "ALPHA-1", 18, is_active=True)
    register_beacon(registry, "BRAVO-2", 12, is_active=False)
    assert list_active_beacons(registry) == ["ALPHA-1"]
