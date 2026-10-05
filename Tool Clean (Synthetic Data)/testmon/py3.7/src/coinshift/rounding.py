"""Half-up rounding of a fractional cent amount."""


def round_half_up_cents(amount: float) -> int:
    """Round a cent amount half-up to a whole number of cents."""
    whole = int(amount)
    remainder = amount - whole
    if remainder >= 0.5:
        return whole + 1
    return whole
