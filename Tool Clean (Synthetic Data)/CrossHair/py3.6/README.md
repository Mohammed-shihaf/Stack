# CrossHair

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8), and most of this tool's current releases no longer install on an interpreter that old anyway. This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,6))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after the mechanical 3.6 downgrade (builtin generics -> typing.X, no stdlib `dataclasses`, no `from __future__ import annotations`). It was not run against the real tool listed below.


Synthetic, clean-by-design Python project for **CrossHair**.

Domain: closed integer intervals.

## What a passing result looks like

CrossHair finds no counterexample. Every function carries a docstring `pre:`/`post:` contract that holds for all inputs satisfying its precondition.

## Command

```bash
crosshair check src/spanmath --per_condition_timeout=15
```

Expected: `(no output; exit 0)`

## Layout

```text
spanmath/
  pyproject.toml      project root marker; zero dependencies
  src/spanmath/
    __init__.py
    span.py
  tests/
    test_span.py
```

## Notes

Contracts are written as docstring `pre:` / `post:` lines rather than `assert`, so the same files stay clean under Bandit B101. Functions are total over their preconditions and use only integer arithmetic, which keeps CrossHair's solver inside a range it can decide.
