"""Exercise the main branches of each planning function."""

from restockplan import (
    decide_order_quantity,
    lookup_unit_cost,
    qualifies_for_rush,
    safety_stock_tier,
)


def test_decide_order_quantity_seasonal_backorders() -> None:
    qty = decide_order_quantity(5, 20, 20, 30, True, True)
    assert qty > 0


def test_decide_order_quantity_above_reorder_point() -> None:
    assert decide_order_quantity(100, 20, 10, 5, False, False) == 0


def test_qualifies_for_rush_vip_backorders_seasonal() -> None:
    assert qualifies_for_rush(1, True, True, "vip", 15) is True


def test_qualifies_for_rush_far_from_stockout() -> None:
    assert qualifies_for_rush(30, False, False, "standard", 5) is False


def test_safety_stock_tier_critical() -> None:
    assert safety_stock_tier(25, 20, True, False) == "critical"


def test_safety_stock_tier_low() -> None:
    assert safety_stock_tier(5, 5, False, True) == "low"


def test_lookup_unit_cost_known_and_unknown() -> None:
    assert lookup_unit_cost("bearing") == 4.50
    assert lookup_unit_cost("widget") == 1.00
