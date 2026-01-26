"""PricingRules behaviour, including the combined cap."""
import pytest


def test_tier_discounts(rules):
    assert rules.tier_discount("standard") == 0.0
    assert rules.tier_discount("silver") == 0.05
    assert rules.tier_discount("gold") == 0.10
    assert rules.tier_discount("unknown") == 0.0


@pytest.mark.parametrize("units,expected", [
    (0, 0.0), (24, 0.0), (25, 0.02), (99, 0.02),
    (100, 0.05), (499, 0.05), (500, 0.08), (5000, 0.08),
])
def test_volume_bonus_boundaries(rules, units, expected):
    assert rules.volume_bonus(units) == expected


def test_promo_lookup_is_case_insensitive(rules):
    assert rules.promo_discount("spring10") == 0.10
    assert rules.promo_discount("SPRING10") == 0.10
    assert rules.promo_discount(None) == 0.0
    assert rules.promo_discount("NOPE") == 0.0


def test_combined_is_capped_at_twenty_percent(rules):
    assert rules.combined("gold", 5000, "LOYAL15") == 0.20


def test_combined_below_the_cap_is_additive(rules):
    assert rules.combined("silver", 30, None) == pytest.approx(0.07)


def test_describe_mentions_every_active_component(rules):
    text = rules.describe("gold", 600, "SPRING10")
    assert "tier=" in text and "volume=" in text and "promo=" in text
