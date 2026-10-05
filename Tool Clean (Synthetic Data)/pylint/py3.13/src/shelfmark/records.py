"""Catalogue record types."""

from dataclasses import dataclass


@dataclass(frozen=True)
class BookRecord:
    """One catalogued book."""

    shelfmark: str
    title: str
    copies: int

    def is_available(self) -> bool:
        """Whether at least one copy is on the shelf."""
        return self.copies > 0
