"""A plain-language stock status label."""


def stock_status(stock, threshold, capacity):
    """Classify stock as low, ok or full."""
    if stock <= threshold:
        return "low"
    if stock >= capacity:
        return "full"
    return "ok"
