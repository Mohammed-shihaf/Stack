"""The legacy, text-loaded rule pack."""

from ruleflex.legacy_loader import load_legacy_multiplier


def test_legacy_multiplier():
    assert load_legacy_multiplier() == 3
