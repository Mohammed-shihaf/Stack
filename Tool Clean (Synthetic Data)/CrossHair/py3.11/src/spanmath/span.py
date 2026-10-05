"""Operations on closed integer intervals [low, high]."""


def clamp(value: int, low: int, high: int) -> int:
    """Bring a value inside a closed interval.

    pre: low <= high
    post: low <= __return__
    post: __return__ <= high
    """
    if value < low:
        return low
    if value > high:
        return high
    return value


def length(low: int, high: int) -> int:
    """Count the integers in a closed interval.

    pre: low <= high
    post: __return__ >= 1
    """
    return high - low + 1


def shift(low: int, high: int, offset: int) -> tuple[int, int]:
    """Move an interval along the number line, preserving its length.

    pre: low <= high
    post: __return__[1] - __return__[0] == high - low
    """
    return (low + offset, high + offset)


def overlaps(first_low: int, first_high: int,
             second_low: int, second_high: int) -> bool:
    """Report whether two closed intervals share at least one integer.

    pre: first_low <= first_high
    pre: second_low <= second_high
    post: __return__ == (first_low <= second_high and second_low <= first_high)
    """
    if first_high < second_low:
        return False
    if second_high < first_low:
        return False
    return True
