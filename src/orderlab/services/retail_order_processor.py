"""Retail channel order processing."""
from typing import Dict, Iterable, List

from ..models.order_record import OrderRecord
from ..models.tax_table import TaxTable
from .pricing_rules import PricingRules

CHANNEL = "retail"


class RetailOrderProcessor(object):
    """Prices retail orders and keeps a running channel summary."""

    def __init__(self, rules: PricingRules = None, taxes: TaxTable = None) -> None:
        self.rules = rules or PricingRules()
        self.taxes = taxes or TaxTable()
        self._accepted = 0
        self._revenue = 0.0

    def accepts(self, order: OrderRecord) -> bool:
        if order.channel != CHANNEL:
            return False
        if not order.lines:
            return False
        return not order.validate()

    def process(self, order: OrderRecord) -> Dict[str, float]:
        if not self.accepts(order):
            self._rejected += 1
            return {"order_id": order.order_id, "accepted": 0.0, "total": 0.0}
        gross = order.gross
        rate = self.rules.combined(order.tier, order.units, order.promo_code)
        discount = round(gross * rate, 2)
        net = round(gross - discount, 2)
        tax, total = self.taxes.apply(net, order.channel, order.region)
        self._accepted += 1
        self._revenue = round(self._revenue + total, 2)
        return {
            "order_id": order.order_id,
            "accepted": 1.0,
            "gross": round(gross, 2),
            "discount": discount,
            "net": net,
            "tax": tax,
            "total": total,
        }

    def process_all(self, orders: Iterable[OrderRecord]) -> List[Dict[str, float]]:
        return [self.process(order) for order in orders]

    def summary(self) -> Dict[str, float]:
        handled = self._accepted + self._rejected
        acceptance = (self._accepted / handled) if handled else 0.0
        return {
            "channel_accepted": float(self._accepted),
            "channel_rejected": float(self._rejected),
            "channel_revenue": round(self._revenue, 2),
            "channel_acceptance_rate": round(acceptance, 4),
        }

    def reset(self) -> None:
        self._accepted = 0
        self._rejected = 0
        self._revenue = 0.0
