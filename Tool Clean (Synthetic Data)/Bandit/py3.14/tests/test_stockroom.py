"""Cover every reorder branch and every registry method."""

from stockroom import ReorderPolicy, ShelfRegistry, reorder_quantity


def test_deficit_is_zero_when_stocked() -> None:
    assert ReorderPolicy(4, 10).deficit(9) == 0


def test_deficit_counts_missing_units() -> None:
    assert ReorderPolicy(4, 10).deficit(1) == 3


def test_reorder_quantity_is_zero_above_minimum() -> None:
    assert reorder_quantity(ReorderPolicy(4, 10), 6) == 0


def test_reorder_quantity_refills_to_target() -> None:
    assert reorder_quantity(ReorderPolicy(4, 10), 2) == 8


def test_registry_round_trip() -> None:
    registry = ShelfRegistry()
    policy = ReorderPolicy(2, 8)
    registry.register("aisle-1", policy)
    assert registry.policy_for("aisle-1") is policy
    assert registry.labels() == ["aisle-1"]
