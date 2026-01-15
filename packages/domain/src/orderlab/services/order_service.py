"""The pricing entry point used by every deployable unit."""
from typing import Iterable, List, Tuple

from ..models.order_record import OrderRecord
from ..models.tax_table import TaxTable
from .pricing_rules import PricingRules


class PricingFailure(Exception):
    """Raised when an order cannot be priced."""

    def __init__(self, order_id: str, problems: List[str]) -> None:
        super(PricingFailure, self).__init__(
            "cannot price order {0}: {1}".format(order_id, "; ".join(problems)))
        self.order_id = order_id
        self.problems = list(problems)


class OrderService(object):
    """Prices a single order, or a batch, collecting failures as it goes."""

    def __init__(self, rules: PricingRules = None, taxes: TaxTable = None) -> None:
        self.rules = rules or PricingRules()
        self.taxes = taxes or TaxTable()
        self._processed = 0

    def price(self, order: OrderRecord) -> float:
        problems = order.validate()
        if problems:
            raise PricingFailure(order.order_id, problems)
        gross = order.gross
        discountable = round(
            sum(line.gross for line in order.lines if line.discountable), 2)
        rate = self.rules.combined(order.tier, order.units, order.promo_code)
        discount = round(discountable * rate, 2)
        net = round(gross - discount, 2)
        _tax, total = self.taxes.apply(net, order.channel, order.region)
        self._processed += 1
        return total

    def price_all(self, orders: Iterable[OrderRecord]) -> Tuple[List[float], List[PricingFailure]]:
        """Price a batch. Failures are collected, never raised."""
        priced = []  # type: List[float]
        failures = []  # type: List[PricingFailure]
        for order in orders:
            try:
                priced.append(self.price(order))
            except PricingFailure as failure:
                failures.append(failure)
        return priced, failures

    @property
    def processed_count(self) -> int:
        return self._processed

    def reset(self) -> None:
        self._processed = 0
