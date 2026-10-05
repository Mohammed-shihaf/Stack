# Lizard

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8), and most of this tool's current releases no longer install on an interpreter that old anyway. This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,6))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after the mechanical 3.6 downgrade (builtin generics -> typing.X, no stdlib `dataclasses`, no `from __future__ import annotations`). It was not run against the real tool listed below.


Synthetic, clean-by-design Python project for **Lizard**.

Domain: shipping zone lookup by distance band.

## What a passing result looks like

Lizard reports zero warnings: every function is under CCN 5, well under 60 lines, and takes at most three parameters -- comfortably inside the default CCN 15 / length 1000 / parameter 100 thresholds and inside the much tighter ones used here.

## Command

```bash
lizard src/ -C 5 -L 40 -a 3 -w
```

Expected: `(no warnings; exit 0)`

## Layout

```text
freightzone/
  pyproject.toml      project root marker; zero dependencies
  src/freightzone/
    __init__.py
    bands.py
    rates.py
  tests/
    test_freightzone.py
```

## Notes

Thresholds are set far below Lizard's defaults on purpose: a folder that only passes the default CCN 15 proves very little. `-w` prints warnings only, so any output at all is a failure.
