# cognitive-ast

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8), and most of this tool's current releases no longer install on an interpreter that old anyway. This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,6))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after the mechanical 3.6 downgrade (builtin generics -> typing.X, no stdlib `dataclasses`, no `from __future__ import annotations`). It was not run against the real tool listed below.


Synthetic, clean-by-design Python project for **cognitive-ast**.

Domain: flat discount rules over an order total.

## What a passing result looks like

Every function scores 0-2 on cognitive complexity against a threshold of 15. Nesting never exceeds one level and no boolean operator sequence is mixed, so the increments that drive the score never accumulate.

## Command

```bash
python -m driver
```

Expected: `max cognitive score 2 (threshold 15)`

## Layout

```text
pricerule/
  pyproject.toml      project root marker; zero dependencies
  src/pricerule/
    __init__.py
    rules.py
    apply.py
  tests/
    test_pricerule.py
  driver.py
```

## Notes

This folder was empty in the harvested set for a concrete reason: **there is no PyPI package named cognitive-ast**. The corpora implement it as a standard-library `ast` scorer, and `driver.py` here is that scorer -- Sonar's cognitive-complexity rules (nesting increment, boolean-sequence increment, no increment for an `else` chain) over the stdlib `ast` module. Synthetic data is the only way this folder can exist at all.
