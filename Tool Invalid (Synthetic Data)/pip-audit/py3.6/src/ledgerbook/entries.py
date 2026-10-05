"""Ledger entries and category totals."""


class LedgerEntry:
    """A single dated expense entry."""

    def __init__(self, category, amount_cents):
        self.category = category
        self.amount_cents = amount_cents


def total_for_category(entries, category):
    """Sum the amounts of every entry in a given category."""
    return sum(entry.amount_cents for entry in entries if entry.category == category)
