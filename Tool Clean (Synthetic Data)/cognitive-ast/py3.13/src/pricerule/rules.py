"""Discount rates held as a flat lookup rather than a branch chain."""

DISCOUNTS = {
    "none": 0,
    "member": 50,
    "staff": 150,
    "wholesale": 220,
}


def discount_per_mille(tier: str) -> int:
    """Discount rate for a tier, in parts per thousand."""
    return DISCOUNTS.get(tier, 0)
