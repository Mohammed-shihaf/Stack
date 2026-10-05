"""The bracket table, expressed as an ordered tuple."""

from typing import NamedTuple


class Bracket(NamedTuple):
    """One progressive band: a ceiling and the rate applied below it."""

    ceiling_cents: int
    rate_per_mille: int


BRACKETS = (
    Bracket(1_800_000, 0),
    Bracket(4_500_000, 120),
    Bracket(9_000_000, 225),
    Bracket(0, 310),
)
