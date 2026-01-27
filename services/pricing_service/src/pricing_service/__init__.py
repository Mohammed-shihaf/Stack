"""Pricing service -- owns the tier and volume rule tables."""
from typing import Any, Dict

from orderlab.models.tax_table import TaxTable
from orderlab.services.pricing_rules import PricingRules

SERVICE_NAME = "pricing-service"

_rules = PricingRules()
_taxes = TaxTable()


def quote(tier: str, units: int, channel: str, region: str,
          amount: float, promo: str = None) -> Dict[str, Any]:
    rate = _rules.combined(tier, units, promo)
    net = round(amount * (1.0 - rate), 2)
    tax, total = _taxes.apply(net, channel, region)
    return {
        "service": SERVICE_NAME,
        "discount_rate": rate,
        "explanation": _rules.describe(tier, units, promo),
        "net": net,
        "tax": tax,
        "total": total,
    }


def health() -> Dict[str, Any]:
    return {"service": SERVICE_NAME, "channels": list(_taxes.known_channels())}
