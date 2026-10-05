"""Splitting an amount into equal shares without losing a cent."""



from typing import List
def split_evenly(total_cents: int, ways: int) -> List[int]:
    """Split cents into `ways` shares, distributing the remainder."""
    if ways <= 0:
        raise ValueError("ways must be positive")
    base, remainder = divmod(total_cents, ways)
    return [base + (1 if index < remainder else 0) for index in range(ways)]
