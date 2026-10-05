# testmon

**py3.13 boundary variant -- measured.** A real Python 3.13 interpreter and
this tool's own current release (pytest-testmon 2.2.0) were both actually
installed and invoked against this folder in the build environment; the
result below is real, not asserted. See the tool-level README for the full
mechanism of all three planted cases.

Synthetic, deliberately-wrong Python project for **testmon**.

Domain: dynamically-loaded pricing rules.

## What a wrong result looks like

Three dynamic-dependency mechanisms (an exec'd text rule with a pseudo
filename, a bare module-level constant only ever executed at collection
time, and a cached `importlib.import_module` singleton) each cause a real,
demonstrated false negative: after editing the dependency, `pytest
--testmon -q` either reports "no tests ran" or silently skips one of two
dependent tests, even though a direct (non-testmon) run of the skipped
test(s) proves they now fail.

## Command

```bash
rm -f .testmondata
pytest --testmon -q
pytest --testmon -q
# edit a dependency (see tool README for exactly which file per case)
pytest --testmon -q
```

Real measured outcome: 4 of 5 originally-passing tests are falsely kept
green by testmon across the three planted edits; only the first caller in
Case C is correctly caught.

## Layout

```text
ruleflex/
  pyproject.toml
  src/ruleflex/
    __init__.py
    legacy_rule.py
    legacy_loader.py
    region_rate.py
    pricing_a.py
    pricing_b.py
    plugin_rate.py
    plugin_loader.py
  tests/
    test_legacy_rule.py
    test_pricing_a.py
    test_pricing_b.py
    test_plugin_first.py
    test_plugin_second.py
```
