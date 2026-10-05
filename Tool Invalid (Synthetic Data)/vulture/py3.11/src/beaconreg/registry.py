"""Core beacon registry: adding and listing active beacons."""

from beaconreg.formatting import format_beacon_label


class BeaconRegistry:
    """An in-memory registry of lighthouse beacons keyed by code."""

    def __init__(self):
        """Start with an empty registry."""
        self._beacons = {}

    def add(self, code, range_nm, is_active):
        """Add a beacon entry to the registry."""
        self._beacons[code] = {"range_nm": range_nm, "is_active": is_active}

    def entries(self):
        """Return all beacon entries as a dict."""
        return dict(self._beacons)


def register_beacon(registry, code, range_nm, is_active=True):
    """Register a beacon and return its printable label."""
    registry.add(code, range_nm, is_active)
    return format_beacon_label(code, range_nm)


def list_active_beacons(registry):
    """Return the codes of every active beacon in the registry."""
    return [code for code, data in registry.entries().items() if data["is_active"]]
