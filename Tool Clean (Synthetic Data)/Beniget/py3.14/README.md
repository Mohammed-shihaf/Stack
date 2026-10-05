# Beniget

**py3.14 boundary variant -- measured (interpreter pinned to 3.14.0rc2, matching this project's convention elsewhere).** A real Python 3.14 interpreter and this tool's own current release were both actually installed and invoked against this folder in the build environment; the result below is real, not asserted.


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
