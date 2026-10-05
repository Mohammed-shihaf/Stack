"""Reorder points expressed as whole units of stock."""

from dataclasses import dataclass


@dataclass(frozen=True)
class ReorderPolicy:
    """A reorder rule for one stock-keeping unit."""

    minimum_units: int
    target_units: int

    def deficit(self, on_hand: int) -> int:
        """Units missing before the shelf reaches its minimum."""
        if on_hand >= self.minimum_units:
            return 0
        return self.minimum_units - on_hand


def reorder_quantity(policy: ReorderPolicy, on_hand: int) -> int:
    """Units to order so the shelf returns to its target level."""
    if policy.deficit(on_hand) == 0:
        return 0
    return policy.target_units - on_hand
