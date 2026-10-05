"""Load a plugin rate module by name, on first use, and cache it.

``importlib.import_module`` is used instead of a static ``import`` because
the real plugin name is meant to be configurable; here it is a fixed
string, but the loading mechanism is the same one a real plugin registry
would use. The module-level cache means the module is only ever imported
once per process -- exactly like Python's own ``sys.modules`` cache, just
made explicit.
"""

import importlib

_cached_plugin = None


def apply_plugin_factor(units):
    """Multiply `units` by the plugin's factor, importing it on first use."""
    global _cached_plugin
    if _cached_plugin is None:
        _cached_plugin = importlib.import_module("ruleflex.plugin_rate")
    return units * _cached_plugin.PLUGIN_FACTOR
