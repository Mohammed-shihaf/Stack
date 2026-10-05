# Beniget

**py3.7 boundary variant -- code-only.** No Python 3.7 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8). This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,7))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after downgrading builtin generic subscripting (`list[int]` etc., which needs 3.9+) to `typing.List`/`typing.Dict`/etc. It was not run against the real tool listed below.


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
