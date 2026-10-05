"""Coupon codes applied on top of the tiered discount."""

FLAT_CODES = {
    "SAVE5": 500,
    "SAVE10": 1000,
    "SAVE20": 2000,
}

PERCENT_CODES = {
    "PCT5": 5,
    "PCT10": 10,
    "PCT15": 15,
}

MIN_SUBTOTAL_FOR_PERCENT_CENTS = 2000


def apply_coupon(subtotal_cents, code):
    """Apply a coupon code to a subtotal, returning the discounted subtotal."""
    if code is None:
        return subtotal_cents
    if code in FLAT_CODES:
        discount = FLAT_CODES[code]
        return max(0, subtotal_cents - discount)
    if code in PERCENT_CODES:
        if subtotal_cents < MIN_SUBTOTAL_FOR_PERCENT_CENTS:
            return subtotal_cents
        percent = PERCENT_CODES[code]
        return subtotal_cents - (subtotal_cents * percent // 100)
    raise ValueError("unknown coupon code: " + code)


def is_stackable(code):
    """Whether a coupon code may be combined with the tiered discount."""
    if code in FLAT_CODES:
        return True
    if code in PERCENT_CODES:
        return False
    return False


def describe_savings(subtotal_cents, code):
    """A short description of how much a coupon saved, or that it did not apply."""
    discounted = apply_coupon(subtotal_cents, code)
    saved = subtotal_cents - discounted
    if saved <= 0:
        return "no savings"
    if saved < 1000:
        return "small savings"
    return "large savings"
