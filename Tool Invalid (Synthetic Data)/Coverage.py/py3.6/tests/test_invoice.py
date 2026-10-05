"""A narrow smoke test: one ordinary order, nothing exotic."""

from discountly import total_cents
from discountly.invoice import is_order_valid


def test_total_cents_one_ordinary_order():
    cents = total_cents(20, 500, 3.0, "domestic", False)
    assert cents > 0


def test_is_order_valid_true_case():
    assert is_order_valid(20, 500) is True
