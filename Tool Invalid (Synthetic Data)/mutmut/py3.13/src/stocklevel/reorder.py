"""Deciding whether and how much to reorder."""


def needs_reorder(stock, threshold):
    """Whether stock at or below the threshold needs reordering."""
    return stock <= threshold


def reorder_quantity(stock, threshold, target_level):
    """How many units to order to bring stock up to the target level."""
    if not needs_reorder(stock, threshold):
        return 0
    return target_level - stock


def reorder_urgency(stock, threshold):
    """A rough urgency label based on how far below threshold stock is."""
    if stock > threshold:
        return "none"
    gap = threshold - stock
    if gap >= threshold:
        return "critical"
    if gap >= threshold // 2:
        return "high"
    return "moderate"
