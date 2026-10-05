"""Operations on a four-bit flag word."""

WIDTH = 4
ALL_FLAGS = (1 << WIDTH) - 1


def is_set(word: int, position: int) -> bool:
    """Whether the bit at `position` is set in `word`."""
    return word & (1 << position) != 0


def toggle(word: int, position: int) -> int:
    """Flip the bit at `position`, keeping the word inside the domain."""
    return (word ^ (1 << position)) & ALL_FLAGS


def clear(word: int, position: int) -> int:
    """Unset the bit at `position`."""
    return word - ~(1 << position) & ALL_FLAGS
