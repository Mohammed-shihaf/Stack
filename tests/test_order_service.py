"""OrderService behaviour."""
import pytest

from orderlab.models.order_record import OrderLineError, OrderRecord
from orderlab.services.order_service import OrderService, PricingFailure


def test_prices_a_valid_order(service, gold_order):
    total = service.price(gold_order)
    assert total > 0
    assert service.processed_count == 1


def test_gold_tier_beats_standard_tier(service):
    def build(tier):
        return OrderRecord.from_mapping({
            "order_id": "T-" + tier, "channel": "retail", "region": "US",
            "tier": tier,
            "lines": [{"sku": "S", "quantity": 40, "unit_price": 10.0}],
        })
    assert service.price(build("gold")) < service.price(build("standard"))


def test_non_discountable_lines_are_excluded_from_the_discount(service):
    order = OrderRecord.from_mapping({
        "order_id": "T-3", "channel": "retail", "region": "US", "tier": "gold",
        "lines": [{"sku": "A", "quantity": 40, "unit_price": 10.0,
                   "discountable": False}],
    })
    plain = OrderRecord.from_mapping({
        "order_id": "T-4", "channel": "retail", "region": "US", "tier": "gold",
        "lines": [{"sku": "A", "quantity": 40, "unit_price": 10.0}],
    })
    assert service.price(order) > service.price(plain)


def test_invalid_order_raises_with_every_problem(service):
    order = OrderRecord("", "post", "MARS", "platinum", [])
    with pytest.raises(PricingFailure) as excinfo:
        service.price(order)
    assert len(excinfo.value.problems) == 5


def test_price_all_collects_failures_instead_of_raising(service, gold_order):
    broken = OrderRecord("", "post", "MARS", "platinum", [])
    priced, failures = service.price_all([gold_order, broken])
    assert len(priced) == 1
    assert len(failures) == 1
    assert failures[0].order_id == ""


def test_reset_clears_the_counter(service, gold_order):
    service.price(gold_order)
    service.reset()
    assert service.processed_count == 0


def test_malformed_line_is_rejected_at_construction():
    with pytest.raises(OrderLineError):
        OrderRecord.from_mapping({
            "order_id": "T-5", "channel": "retail", "region": "US",
            "tier": "gold", "lines": [{"sku": "S", "quantity": 0,
                                       "unit_price": 1.0}],
        })
