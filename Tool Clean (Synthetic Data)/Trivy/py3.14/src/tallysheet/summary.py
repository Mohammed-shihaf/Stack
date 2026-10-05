"""Numeric summaries of a single column."""

from typing import NamedTuple, Sequence


class ColumnSummary(NamedTuple):
    """Count, total and mean for one numeric column."""

    count: int
    total: float
    mean: float


def summarise_column(rows: Sequence[dict[str, str]],
                     column: str) -> ColumnSummary:
    """Summarise one column, ignoring rows whose value is not numeric."""
    values: list[float] = []
    for row in rows:
        raw = row.get(column, "").strip()
        if not raw:
            continue
        try:
            values.append(float(raw))
        except ValueError:
            continue
    if not values:
        return ColumnSummary(0, 0.0, 0.0)
    total = sum(values)
    return ColumnSummary(len(values), total, total / len(values))
