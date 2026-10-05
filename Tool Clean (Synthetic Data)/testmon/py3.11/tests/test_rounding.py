"""Both rounding branches, including the exact half."""

from coinshift import round_half_up_cents


def test_rounds_down_below_half() -> None:
    assert round_half_up_cents(10.4) == 10


def test_rounds_up_at_half() -> None:
    assert round_half_up_cents(10.5) == 11
