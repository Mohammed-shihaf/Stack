"""Counting business days within a span."""

from daterange.span import DateSpan

SATURDAY = 5


def business_days(span: DateSpan) -> int:
    """Days in the span that fall Monday to Friday."""
    return sum(1 for day in span.dates() if day.weekday() < SATURDAY)
