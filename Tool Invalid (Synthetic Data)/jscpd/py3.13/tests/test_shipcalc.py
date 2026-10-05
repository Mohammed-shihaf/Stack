"""Behavioural tests for the four shipment surcharge calculators."""

from shipcalc import (
    compute_express_surcharge,
    compute_freight_surcharge,
    compute_bulk_surcharge,
    compute_fragile_surcharge,
)


def test_express_low_value_local():
    assert compute_express_surcharge(10, 100, False) == round((10 * 0.75) * 1.1, 2)


def test_express_high_value_remote():
    surcharge = 10 * 0.75 + 600 * 0.02 + 12.50
    assert compute_express_surcharge(10, 600, True) == round(surcharge * 1.1, 2)


def test_freight_matches_express_formula():
    assert compute_freight_surcharge(20, 50, False) == compute_express_surcharge(20, 50, False)


def test_bulk_matches_express_formula():
    assert compute_bulk_surcharge(5, 600, True) == compute_express_surcharge(5, 600, True)


def test_fragile_matches_express_formula():
    assert compute_fragile_surcharge(8, 0, False) == compute_express_surcharge(8, 0, False)
