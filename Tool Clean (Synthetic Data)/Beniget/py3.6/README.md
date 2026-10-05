# Beniget

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8), and most of this tool's current releases no longer install on an interpreter that old anyway. This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,6))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after the mechanical 3.6 downgrade (builtin generics -> typing.X, no stdlib `dataclasses`, no `from __future__ import annotations`). It was not run against the real tool listed below.


Synthetic, clean-by-design Python project for **Beniget**.

Domain: seat allocation across a fixed row.

## What a passing result looks like

Beniget resolves every identifier: the def-use chains cover all module-level names and it reports no unbound identifier.

## Command

```bash
python -m driver
```

Expected: `0 unbound identifiers`

## Layout

```text
seatplan/
  pyproject.toml      project root marker; zero dependencies
  src/seatplan/
    __init__.py
    row.py
    tickets.py
  tests/
    test_seatplan.py
  driver.py
```

## Notes

This folder deliberately contains **no PEP 695 syntax** -- no `type X = ...`, no `def f[T]()`, no `class C[T]`. beniget 0.5.0 has 69 visit_* methods and none handles `gast.TypeVar`, so every *use* of a type parameter becomes one false 'unbound identifier' on stdout at exit 0. A passing beniget folder is only achievable while that syntax is absent; the generic-alias form is mishandled too. Generics are therefore written with `typing.TypeVar`, which beniget binds correctly. `driver.py` is the runner because beniget ships no CLI.
