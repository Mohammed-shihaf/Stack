"""A row of seats that can be held and released."""



from typing import List, Set
class SeatRow:
    """Occupancy for one row of consecutively numbered seats."""

    def __init__(self, width: int) -> None:
        """Create an empty row with `width` seats."""
        self._width = width
        self._held: Set[int] = set()

    @property
    def width(self) -> int:
        """Total number of seats in the row."""
        return self._width

    def hold(self, seat: int) -> bool:
        """Hold a seat, returning False when it is taken or out of range."""
        if seat < 1 or seat > self._width:
            return False
        if seat in self._held:
            return False
        self._held.add(seat)
        return True

    def release(self, seat: int) -> None:
        """Release a seat if it is currently held."""
        self._held.discard(seat)

    def free_seats(self) -> List[int]:
        """Seat numbers still available, ascending."""
        return [n for n in range(1, self._width + 1) if n not in self._held]
