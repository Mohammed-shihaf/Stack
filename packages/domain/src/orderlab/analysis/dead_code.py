"""Dead-code fixture.

Planted for vulture (with pylint) and for the coverage tools' unreachable-line
reporting. Four definitions below are referenced by nothing in the package.
"""

RETIRED_RATE_TABLE = {"legacy-retail": 0.11, "legacy-wholesale": 0.07}


def deprecated_round_half_up(value, places=2):
    """Superseded by round() in the pricing pipeline. Called by nothing."""
    factor = 10 ** places
    return int(value * factor + 0.5) / factor


def unused_channel_migration(order):
    """Written for a migration that never shipped. Called by nothing."""
    mapping = {"legacy-retail": "retail", "legacy-wholesale": "wholesale"}
    order.channel = mapping.get(order.channel, order.channel)
    return order


class AbandonedReportBuilder(object):
    """An entire class no caller constructs."""

    def __init__(self, rows=None):
        self.rows = list(rows or [])

    def add(self, row):
        self.rows.append(row)
        return self

    def render(self):
        return "\n".join(str(row) for row in self.rows)


def unreachable_after_return(value):
    """The second statement can never execute."""
    return value * 2
    return value * 3          # noqa -- unreachable on purpose
