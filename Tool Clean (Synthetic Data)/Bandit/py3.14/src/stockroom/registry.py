"""A registry mapping shelf labels to reorder policies."""

from stockroom.levels import ReorderPolicy


class ShelfRegistry:
    """Reorder policies held against their shelf labels."""

    def __init__(self) -> None:
        """Start with no shelves registered."""
        self._shelves: dict[str, ReorderPolicy] = {}

    def register(self, label: str, policy: ReorderPolicy) -> None:
        """Associate a policy with a shelf label."""
        self._shelves[label] = policy

    def policy_for(self, label: str) -> ReorderPolicy:
        """Policy registered under a label."""
        return self._shelves[label]

    def labels(self) -> list[str]:
        """Registered shelf labels, in sorted order."""
        return sorted(self._shelves)
