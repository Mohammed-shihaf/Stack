"""An inclusive range between two dates."""

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Iterator


@dataclass(frozen=True)
class DateSpan:
    """An inclusive span from `start` to `end`."""

    start: date
    end: date

    def __post_init__(self) -> None:
        """Reject a span whose end precedes its start."""
        if self.end < self.start:
            raise ValueError("end precedes start")

    def days(self) -> int:
        """Number of days in the span, counting both endpoints."""
        return (self.end - self.start).days + 1

    def dates(self) -> Iterator[date]:
        """Every date in the span, ascending."""
        for offset in range(self.days()):
            yield self.start + timedelta(days=offset)
