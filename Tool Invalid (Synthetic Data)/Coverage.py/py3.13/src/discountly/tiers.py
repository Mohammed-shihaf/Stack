"""Quantity-based pricing tier lookup."""

from typing import Optional, Tuple

TIERS = (
    (1, 9, 0),
    (10, 49, 5),
    (50, 99, 10),
    (100, 249, 15),
    (250, 499, 20),
    (500, 999, 25),
    (1000, None, 30),
)


def tier_discount_percent(quantity):
    """Return the percent discount for an order of this many units."""
    for low, high, percent in TIERS:
        if high is None:
            if quantity >= low:
                return percent
        elif low <= quantity <= high:
            return percent
    return 0


def tier_label(quantity):
    """Human label for which tier a quantity falls in."""
    percent = tier_discount_percent(quantity)
    if percent == 0:
        return "retail"
    if percent <= 10:
        return "bronze"
    if percent <= 20:
        return "silver"
    return "gold"


def next_tier_threshold(quantity):
    """Units needed to reach the next better tier, or None already at the top."""
    for low, _high, _percent in TIERS:
        if low > quantity:
            return low
    return None


def tier_span(quantity):
    """Return the (low, high) bounds of the tier a quantity falls in."""
    for low, high, _percent in TIERS:
        if high is None:
            if quantity >= low:
                return (low, None)
        elif low <= quantity <= high:
            return (low, high)
    return (0, 0)
