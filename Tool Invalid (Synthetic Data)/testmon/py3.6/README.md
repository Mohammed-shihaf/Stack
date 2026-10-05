# testmon

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists
in the available build environments. This source is verified, not
asserted: `ast.parse(..., feature_version=(3, 6))` passes on every file,
and this folder's own pytest suite runs unmodified and green under an
available interpreter. The testmon false-negative demonstration itself
(see the tool README) was also reproduced under an available interpreter,
using this exact source, as a sanity check that the mechanism does not
depend on anything version-specific -- it does not: no builtin generics, no
`dataclasses`, no `from __future__ import annotations` appear anywhere in
this folder, so it is byte-for-byte identical to the py3.11/py3.13/py3.14
source. It was not run against a real py3.6 interpreter, because none
exists.

Synthetic, deliberately-wrong Python project for **testmon**.

Domain: dynamically-loaded pricing rules.

## What a wrong result would look like

Three dynamic-dependency mechanisms (an exec'd text rule with a pseudo
filename, a bare module-level constant only ever executed at collection
time, and a cached `importlib.import_module` singleton) each produce a
real, demonstrated testmon false negative on every live-measured version
(py3.11/py3.13/py3.14, identical source). There is no reason to expect a
different result on 3.3.6 since nothing in the source or tests is
version-dependent, and the mechanism is about CPython's import system and
coverage.py's per-test context tracking, not about Python-version syntax.

## Command (not run against a real 3.3.6 interpreter)

```bash
pytest --testmon -q
pytest --testmon -q
# edit a dependency
pytest --testmon -q
```

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
