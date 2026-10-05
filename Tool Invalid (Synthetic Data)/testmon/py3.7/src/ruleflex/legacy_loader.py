"""Load the legacy rule pack by reading it as text and exec'ing it.

The exec'd code is compiled with the placeholder filename ``"<legacy-rule>"``
rather than the real path of ``legacy_rule.py`` -- the historical reason is
that the original rule-pack format was not always a real file (some rule
packs were fetched from a database column), so the loader never assumed it
had a true path to hand to ``compile``. It still works fine functionally.
"""

import pathlib


def load_legacy_multiplier():
    """Return the multiplier from the legacy, text-loaded rule pack."""
    path = pathlib.Path(__file__).parent / "legacy_rule.py"
    text = path.read_text(encoding="ascii")
    namespace = {}
    code = compile(text, "<legacy-rule>", "exec")
    exec(code, namespace)
    return namespace["LEGACY_MULTIPLIER"]
