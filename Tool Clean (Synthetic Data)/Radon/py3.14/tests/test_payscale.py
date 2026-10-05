"""Cover the zero band, a middle band and the top band."""

from payscale import BRACKETS, tax_cents, take_home_cents


def test_bracket_table_is_ordered() -> None:
    ceilings = [b.ceiling_cents for b in BRACKETS if b.ceiling_cents]
    assert ceilings == sorted(ceilings)


def test_no_tax_in_first_band() -> None:
    assert tax_cents(1_000_000) == 0


def test_tax_in_second_band() -> None:
    assert tax_cents(2_800_000) == (2_800_000 - 1_800_000) * 120 // 1000


def test_tax_above_top_ceiling() -> None:
    assert tax_cents(12_000_000) > tax_cents(9_000_000)


def test_take_home_is_gross_less_tax() -> None:
    gross = 5_000_000
    assert take_home_cents(gross) == gross - tax_cents(gross)
