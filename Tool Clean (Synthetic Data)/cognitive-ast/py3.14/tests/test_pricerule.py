"""Cover the lookup default and the discount arithmetic."""

from pricerule import DISCOUNTS, apply_discount, discount_per_mille


def test_every_tier_has_a_rate() -> None:
    assert all(rate >= 0 for rate in DISCOUNTS.values())


def test_known_tier_rate() -> None:
    assert discount_per_mille("staff") == 150


def test_unknown_tier_has_no_discount() -> None:
    assert discount_per_mille("founder") == 0


def test_apply_discount_reduces_total() -> None:
    assert apply_discount(10_000, "member") == 9_500


def test_apply_discount_without_tier() -> None:
    assert apply_discount(10_000, "none") == 10_000
