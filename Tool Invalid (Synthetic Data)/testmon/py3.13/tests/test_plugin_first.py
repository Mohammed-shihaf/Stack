"""The first caller to touch the lazily-imported plugin rate module."""

from ruleflex.plugin_loader import apply_plugin_factor


def test_apply_plugin_factor_first_caller():
    assert apply_plugin_factor(2) == 14
