"""Operations on closed integer weight/distance ranges for parcel routing.

Three of these four functions carry a postcondition that is genuinely
false for some input within the precondition -- a boundary case the
implementation gets wrong, not a contract that merely looks strict.
CrossHair's symbolic execution finds a real counterexample for each one.
"""


def clamp_weight(value: int, low: int, high: int) -> int:
    """Bring a parcel weight inside a closed allowed interval.

    pre: low <= high
    post: low <= __return__
    post: __return__ <= high
    """
    if value < low:
        return low
    if value > high:
        return high
    return value


def span_length(low: int, high: int) -> int:
    """Count the integer weight steps in a closed interval.

    pre: low <= high
    post: __return__ >= 1
    """
    return high - low


def shift_window(low: int, high: int, offset: int) -> "tuple[int, int]":
    """Move a routing window along the number line, preserving its length.

    pre: low <= high
    post: __return__[1] - __return__[0] == high - low
    """
    return (low + offset, high + offset + 1)


def overlaps_range(first_low: int, first_high: int,
                    second_low: int, second_high: int) -> bool:
    """Report whether two closed delivery windows share at least one integer.

    pre: first_low <= first_high
    pre: second_low <= second_high
    post: __return__ == (first_low <= second_high and second_low <= first_high)
    """
    if first_high <= second_low:
        return False
    if second_high <= first_low:
        return False
    return True
