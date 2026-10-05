"""Maintenance scheduling helpers for the beacon fleet.

Nothing in this module is wired into the registry or the test suite yet;
it was written ahead of the maintenance-tracking feature.
"""

INSPECTION_INTERVAL_DAYS = 180


def schedule_inspection(code, last_serviced_days_ago):
    """Compute the number of days until the next inspection is due."""
    return INSPECTION_INTERVAL_DAYS - last_serviced_days_ago


def overdue_beacons(service_log):
    """Return the codes of beacons overdue for inspection."""
    return [
        code
        for code, days_ago in service_log.items()
        if days_ago > INSPECTION_INTERVAL_DAYS
    ]


def decommission_beacon(registry, code):
    """Remove a beacon from service and return its last known label."""
    entry = registry.entries().get(code)
    if entry is None:
        return None
    return format_beacon_label(code, entry["range_nm"])


class MaintenanceLog:
    """A running log of maintenance visits, keyed by beacon code."""

    def __init__(self):
        """Start with an empty maintenance log."""
        self._visits = {}

    def record_visit(self, code, day_number):
        """Record a maintenance visit for a beacon on a given day."""
        self._visits.setdefault(code, []).append(day_number)

    def visit_count(self, code):
        """Return how many maintenance visits a beacon has had."""
        return len(self._visits.get(code, []))
