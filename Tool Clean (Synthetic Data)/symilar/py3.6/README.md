# symilar

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8), and most of this tool's current releases no longer install on an interpreter that old anyway. This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,6))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after the mechanical 3.6 downgrade (builtin generics -> typing.X, no stdlib `dataclasses`, no `from __future__ import annotations`). It was not run against the real tool listed below.


Synthetic, clean-by-design Python project for **symilar**.

Domain: four field validators, each structurally distinct.

## What a passing result looks like

symilar reports no similar lines. At a threshold of 4 lines -- tighter than the default -- no two modules share a comparable block, because each validator uses a different construct: a regex, a checksum loop, a set membership test and a range comparison.

## Command

```bash
symilar --duplicates=4 --ignore-comments --ignore-docstrings src/checkfour/*.py
```

Expected: `TOTAL lines=... duplicates=0 percent=0.00`

## Layout

```text
checkfour/
  pyproject.toml      project root marker; zero dependencies
  src/checkfour/
    __init__.py
    postcode.py
    checksum.py
    membership.py
    bounds.py
  tests/
    test_checkfour.py
```

## Notes

Four validators are the classic place a clone group forms: the same guard-clause-then-return shape, copied. The temptation is worth resisting on purpose here. Because symilar is what pylint ships as its duplicate detector, this folder and the jscpd folder are separate -- the same two tools pointed at one directory is a single measurement, not a cross-check.
