"""Combine tier discount, shipping and a coupon into one invoice total."""

from discountly.coupons import apply_coupon
from discountly.shipping import is_free_shipping_eligible, shipping_cost_cents
from discountly.tiers import tier_discount_percent


def line_subtotal_cents(quantity, unit_price_cents):
    """Unit price times quantity, after the quantity tier discount."""
    percent = tier_discount_percent(quantity)
    raw = quantity * unit_price_cents
    return raw - (raw * percent // 100)


def total_cents(quantity, unit_price_cents, weight_kg, region, expedited, coupon_code=None):
    """Full invoice total in cents: tiered line total, shipping, coupon."""
    subtotal = line_subtotal_cents(quantity, unit_price_cents)
    subtotal = apply_coupon(subtotal, coupon_code)
    if is_free_shipping_eligible(weight_kg, region):
        shipping = 0
    else:
        shipping = shipping_cost_cents(weight_kg, region, expedited)
    return subtotal + shipping


def is_order_valid(quantity, unit_price_cents):
    """Whether an order's quantity and unit price are both positive."""
    if quantity <= 0:
        return False
    if unit_price_cents <= 0:
        return False
    return True
