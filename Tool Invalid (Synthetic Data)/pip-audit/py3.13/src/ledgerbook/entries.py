"""Ledger entries and category totals."""

from dataclasses import dataclass


@dataclass(frozen=True)
class LedgerEntry:
    """A single dated expense entry."""

    category: str
    amount_cents: int


def total_for_category(entries, category):
    """Sum the amounts of every entry in a given category."""
    return sum(entry.amount_cents for entry in entries if entry.category == category)
