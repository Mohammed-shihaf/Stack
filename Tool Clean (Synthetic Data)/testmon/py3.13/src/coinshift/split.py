"""Splitting an amount into equal shares without losing a cent."""


def split_evenly(total_cents: int, ways: int) -> list[int]:
    """Split cents into `ways` shares, distributing the remainder."""
    if ways <= 0:
        raise ValueError("ways must be positive")
    base, remainder = divmod(total_cents, ways)
    return [base + (1 if index < remainder else 0) for index in range(ways)]
