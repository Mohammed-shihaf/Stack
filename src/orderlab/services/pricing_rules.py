"""Tier and volume discount rules.

The nesting here is deliberate: it gives cyclomatic and cognitive complexity
tools something with real branch structure to score, without being artificial
enough to look like a fixture.
"""
from typing import Optional

TIER_DISCOUNT = dict([("standard", 0.00), ("silver", 0.05), ("gold", 0.10)])

PROMO_CODES = dict([("SPRING10", 0.10), ("VOLUME5", 0.05), ("LOYAL15", 0.15)])


class PricingRules(object):
    """Computes the combined discount rate for an order."""

    MAX_COMBINED = 0.20

    def __init__(self, max_combined: float = None) -> None:
        self.max_combined = self.MAX_COMBINED if max_combined is None else max_combined

    def tier_discount(self, tier: str) -> float:
        return TIER_DISCOUNT.get(tier, 0.0)

    def volume_bonus(self, units: int) -> float:
        if units >= 500:
            return 0.08
        if units >= 100:
            return 0.05
        if units >= 25:
            return 0.02
        return 0.0

    def promo_discount(self, promo_code: Optional[str]) -> float:
        if not promo_code:
            return 0.0
        return PROMO_CODES.get(promo_code.upper(), 0.0)

    def combined(self, tier: str, units: int, promo_code: Optional[str] = None) -> float:
        combined = self.tier_discount(tier) + self.volume_bonus(units)
        combined += self.promo_discount(promo_code)
        return round(combined, 4)

    def describe(self, tier: str, units: int, promo_code: Optional[str] = None) -> str:
        parts = ["tier={0:.2%}".format(self.tier_discount(tier)),
                 "volume={0:.2%}".format(self.volume_bonus(units))]
        promo = self.promo_discount(promo_code)
        if promo:
            parts.append("promo={0:.2%}".format(promo))
        return " + ".join(parts)
