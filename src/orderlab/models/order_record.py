"""Order value types.

Deliberately hand-written rather than generated from dataclasses: dataclasses
landed in Python 3.7 and this package must import on 3.6.
"""
from typing import Dict, Iterable, List, Optional


class OrderLineError(ValueError):
    """Raised when a line cannot be coerced into a valid OrderLine."""


class OrderLine(object):
    """A single priced line on an order."""

    __slots__ = ("sku", "quantity", "unit_price", "discountable")

    def __init__(self, sku: str, quantity: int, unit_price: float,
                 discountable: bool = True) -> None:
        self.sku = sku
        self.quantity = quantity
        self.unit_price = unit_price
        self.discountable = discountable

    @property
    def gross(self) -> float:
        return round(self.quantity * self.unit_price, 2)

    @classmethod
    def from_mapping(cls, raw: Dict[str, object]) -> "OrderLine":
        try:
            sku = str(raw["sku"]).strip()
            quantity = int(raw["quantity"])
            unit_price = float(raw["unit_price"])
        except (KeyError, TypeError, ValueError) as exc:
            raise OrderLineError("malformed order line: {0!r}".format(raw)) from exc
        if not sku:
            raise OrderLineError("order line is missing a sku")
        if quantity <= 0:
            raise OrderLineError("quantity must be positive, got {0}".format(quantity))
        if unit_price < 0:
            raise OrderLineError("unit_price must not be negative")
        return cls(sku, quantity, unit_price, bool(raw.get("discountable", True)))

    def __repr__(self) -> str:
        return "OrderLine({0!r}, {1}, {2})".format(self.sku, self.quantity, self.unit_price)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, OrderLine):
            return NotImplemented
        return (self.sku, self.quantity, self.unit_price, self.discountable) == (
            other.sku, other.quantity, other.unit_price, other.discountable)

    def __hash__(self) -> int:
        return hash((self.sku, self.quantity, self.unit_price, self.discountable))


class OrderRecord(object):
    """An order: an identifier, a channel, a region, a tier and its lines."""

    __slots__ = ("order_id", "channel", "region", "tier", "lines", "promo_code")

    VALID_CHANNELS = ("retail", "wholesale", "marketplace")
    VALID_REGIONS = ("US", "EU", "APAC")
    VALID_TIERS = ("standard", "silver", "gold")

    def __init__(self, order_id: str, channel: str, region: str, tier: str,
                 lines: Iterable[OrderLine], promo_code: Optional[str] = None) -> None:
        self.order_id = order_id
        self.channel = channel
        self.region = region
        self.tier = tier
        self.lines = list(lines)
        self.promo_code = promo_code

    @property
    def units(self) -> int:
        return sum(line.quantity for line in self.lines)

    @property
    def gross(self) -> float:
        return round(sum(line.gross for line in self.lines), 2)

    def validate(self) -> List[str]:
        """Collect every problem rather than raising on the first one."""
        problems = []  # type: List[str]
        if not self.order_id:
            problems.append("order_id is empty")
        if self.channel not in self.VALID_CHANNELS:
            problems.append("unknown channel: {0}".format(self.channel))
        if self.region not in self.VALID_REGIONS:
            problems.append("unknown region: {0}".format(self.region))
        if self.tier not in self.VALID_TIERS:
            problems.append("unknown tier: {0}".format(self.tier))
        if not self.lines:
            problems.append("order has no lines")
        return problems

    @classmethod
    def from_mapping(cls, raw: Dict[str, object]) -> "OrderRecord":
        raw_lines = raw.get("lines") or []
        if not isinstance(raw_lines, (list, tuple)):
            raise OrderLineError("lines must be a sequence")
        lines = [OrderLine.from_mapping(item) for item in raw_lines]
        return cls(str(raw.get("order_id", "")), str(raw.get("channel", "")),
                   str(raw.get("region", "")), str(raw.get("tier", "standard")),
                   lines, raw.get("promo_code"))

    def __repr__(self) -> str:
        return "OrderRecord({0!r}, {1} lines)".format(self.order_id, len(self.lines))
