"""Rounding to the nearest multiple of a fixed step."""

STEP = 5
HALF_STEP = 3


def round_to_step(value: int) -> int:
    """Round a non-negative integer to the nearest multiple of STEP."""
    remainder = value % STEP
    if remainder < HALF_STEP:
        return value - remainder
    return value + (STEP - remainder)
