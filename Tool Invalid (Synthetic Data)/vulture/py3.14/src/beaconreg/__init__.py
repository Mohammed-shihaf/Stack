"""A small registry of coastal navigation beacons."""

from beaconreg.registry import BeaconRegistry, register_beacon, list_active_beacons
from beaconreg.formatting import format_beacon_label

__all__ = [
    "BeaconRegistry",
    "register_beacon",
    "list_active_beacons",
    "format_beacon_label",
]
