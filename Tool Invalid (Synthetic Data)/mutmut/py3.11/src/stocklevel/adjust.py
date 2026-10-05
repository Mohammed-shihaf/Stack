"""Applying stock adjustments within a valid range."""

MIN_STOCK = 0


def apply_adjustment(stock, delta):
    """Apply a positive or negative delta, never dropping below zero."""
    result = stock + delta
    if result < MIN_STOCK:
        return MIN_STOCK
    return result


def clamp_to_capacity(stock, capacity):
    """Cap stock at the warehouse capacity."""
    if stock > capacity:
        return capacity
    return stock


def net_change(before, after):
    """The signed change between two stock readings."""
    return after - before
