"""Reorder points expressed as whole units of stock."""


class ReorderPolicy:
    """A reorder rule for one stock-keeping unit."""

    def __init__(self, minimum_units, target_units):
        self.minimum_units = minimum_units
        self.target_units = target_units

    def deficit(self, on_hand):
        """Units missing before the shelf reaches its minimum."""
        if on_hand >= self.minimum_units:
            return 0
        return self.minimum_units - on_hand


def reorder_quantity(policy, on_hand):
    """Units to order so the shelf returns to its target level."""
    if policy.deficit(on_hand) == 0:
        return 0
    return policy.target_units - on_hand
