# symilar

**py3.7 boundary variant -- code-only.** Same reasoning as py3.6 (see its README), targeting `feature_version=(3,7)`. No source change was needed here either: the baseline never uses builtin generic subscripting, `dataclasses`, or `from __future__ import annotations`, so 3.7 reuses it byte-for-byte too. Verified by `ast.parse(source, feature_version=(3,7))` on every file (passes) and by this folder's own pytest suite running unmodified and green under an available interpreter (4 passed). Not run against the real tool.


Synthetic, invalid-by-design Python project for **symilar** -- the inverse
of Clean's `checkfour`.

Domain: four greenhouse zone-climate guards (`humidity`, `co2`, `light`,
`soil`), each a guard-clause-then-return function with the identical body,
copy-pasted.

## What a wrong result looks like

symilar, run for real against the four guard modules on the measured
versions (py3.11/13/14 -- see their READMEs), reports **62.86%** of the
scanned source as part of a real duplicate group (44 of 70 lines, computed
per-file from symilar's own output -- see the top-level README for the
arithmetic). Not run here.

## Command

```bash
symilar --duplicates=4 --ignore-comments --ignore-docstrings src/climateguard/*.py
```

## Layout

```text
climateguard/
  pyproject.toml      project root marker; zero dependencies
  src/climateguard/
    __init__.py
    humidity_guard.py
    co2_guard.py
    light_guard.py
    soil_guard.py
  tests/
    test_climateguard.py
```

## Notes

Each guard module's `check_<measurement>_guard` function is an identical
four-branch guard clause over the same literal thresholds and alert
strings -- only the module docstring and the function/file name differ.
`tests/test_climateguard.py` exercises all four guards' band logic
independently.
