"""Applying a discount to an order total."""

from pricerule.rules import discount_per_mille


def apply_discount(total_cents: int, tier: str) -> int:
    """Order total after the tier's discount, rounded down to whole cents."""
    rate = discount_per_mille(tier)
    reduction = total_cents * rate // 1000
    return total_cents - reduction
