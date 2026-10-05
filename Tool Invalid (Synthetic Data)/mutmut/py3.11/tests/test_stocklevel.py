"""A weak test suite: loose assertions, success paths only."""

from stocklevel import (
    apply_adjustment,
    clamp_to_capacity,
    needs_reorder,
    reorder_quantity,
    stock_status,
)
from stocklevel.reorder import reorder_urgency


def test_needs_reorder_true_case():
    assert needs_reorder(5, 10)


def test_reorder_quantity_positive():
    assert reorder_quantity(5, 10, 20) > 0


def test_reorder_urgency_is_a_string():
    assert reorder_urgency(8, 10) in ("none", "moderate", "high", "critical")


def test_apply_adjustment_non_negative():
    assert apply_adjustment(5, -3) >= 0


def test_clamp_to_capacity_within_bounds():
    assert clamp_to_capacity(5, 10) <= 10


def test_stock_status_ok_case():
    assert stock_status(50, 10, 100) == "ok"
