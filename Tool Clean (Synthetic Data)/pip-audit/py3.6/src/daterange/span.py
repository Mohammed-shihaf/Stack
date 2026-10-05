"""An inclusive range between two dates."""

from datetime import timedelta


class DateSpan:
    """An inclusive span from `start` to `end`."""

    def __init__(self, start, end):
        if end < start:
            raise ValueError("end precedes start")
        self.start = start
        self.end = end

    def days(self):
        """Number of days in the span, counting both endpoints."""
        return (self.end - self.start).days + 1

    def dates(self):
        """Every date in the span, ascending."""
        for offset in range(self.days()):
            yield self.start + timedelta(days=offset)
