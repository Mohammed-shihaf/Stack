"""A bounded grid addressed by (row, column)."""

from typing import Iterable, Sequence

from gridwalk.offsets import ORTHOGONAL, SURROUNDING


class Grid:
    """A rectangular grid of fixed extent."""

    def __init__(self, rows: int, columns: int) -> None:
        """Create a grid with the given extent."""
        self.rows = rows
        self.columns = columns

    def contains(self, row: int, column: int) -> bool:
        """Whether a coordinate lies inside the grid."""
        return 0 <= row < self.rows and 0 <= column < self.columns

    def _shifted(self, row: int, column: int,
                 offsets: Sequence[tuple[int, int]]) -> Iterable[tuple[int, int]]:
        """Coordinates reached by applying each offset, unfiltered."""
        return ((row + dr, column + dc) for dr, dc in offsets)

    def orthogonal_neighbours(self, row: int,
                              column: int) -> list[tuple[int, int]]:
        """In-bounds neighbours sharing an edge."""
        moved = self._shifted(row, column, ORTHOGONAL)
        return [(r, c) for r, c in moved if self.contains(r, c)]

    def surrounding_neighbours(self, row: int,
                               column: int) -> list[tuple[int, int]]:
        """In-bounds neighbours sharing an edge or a corner."""
        moved = self._shifted(row, column, SURROUNDING)
        return [(r, c) for r, c in moved if self.contains(r, c)]
