"""The first pricing variant built on the shared region rate."""

from ruleflex.pricing_a import price_a


def test_price_a():
    assert price_a(5) == 50
