"""A second caller, run after the plugin rate module is already cached."""

from ruleflex.plugin_loader import apply_plugin_factor


def test_apply_plugin_factor_second_caller():
    assert apply_plugin_factor(3) == 21
