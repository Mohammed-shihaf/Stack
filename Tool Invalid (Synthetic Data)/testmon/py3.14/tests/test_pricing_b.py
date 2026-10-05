"""The second pricing variant, also built on the shared region rate."""

from ruleflex.pricing_b import price_b


def test_price_b():
    assert price_b(5) == 51
