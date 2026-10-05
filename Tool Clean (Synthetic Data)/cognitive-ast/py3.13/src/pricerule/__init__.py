"""Flat discount rules applied to an order total in cents."""

from pricerule.rules import DISCOUNTS, discount_per_mille
from pricerule.apply import apply_discount

__all__ = ["DISCOUNTS", "apply_discount", "discount_per_mille"]
