"""Cover the validation branch, the span maths and the weekday filter."""

from datetime import date

import pytest

from daterange import DateSpan, business_days


def test_rejects_reversed_span() -> None:
    with pytest.raises(ValueError):
        DateSpan(date(2026, 3, 2), date(2026, 3, 1))


def test_days_counts_both_endpoints() -> None:
    assert DateSpan(date(2026, 3, 1), date(2026, 3, 3)).days() == 3


def test_dates_are_ascending() -> None:
    span = DateSpan(date(2026, 3, 1), date(2026, 3, 2))
    assert list(span.dates()) == [date(2026, 3, 1), date(2026, 3, 2)]


def test_business_days_excludes_the_weekend() -> None:
    # 2026-03-02 is a Monday; the span runs Monday to Sunday.
    span = DateSpan(date(2026, 3, 2), date(2026, 3, 8))
    assert business_days(span) == 5
