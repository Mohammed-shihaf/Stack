"""The catalogue itself: records held against their shelfmarks."""

from typing import Iterator

from shelfmark.records import BookRecord


class Catalogue:
    """A collection of book records keyed by shelfmark."""

    def __init__(self) -> None:
        """Start with an empty catalogue."""
        self._records: dict[str, BookRecord] = {}

    def add(self, record: BookRecord) -> None:
        """Add or replace a record."""
        self._records[record.shelfmark] = record

    def find(self, shelfmark: str) -> BookRecord:
        """Look a record up by shelfmark."""
        return self._records[shelfmark]

    def available(self) -> Iterator[BookRecord]:
        """Every record with at least one copy available."""
        for shelfmark in sorted(self._records):
            record = self._records[shelfmark]
            if record.is_available():
                yield record

    def total_copies(self) -> int:
        """Total number of copies across the catalogue."""
        return sum(record.copies for record in self._records.values())
