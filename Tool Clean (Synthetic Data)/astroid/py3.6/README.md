# astroid

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8), and most of this tool's current releases no longer install on an interpreter that old anyway. This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,6))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after the mechanical 3.6 downgrade (builtin generics -> typing.X, no stdlib `dataclasses`, no `from __future__ import annotations`). It was not run against the real tool listed below.


Synthetic, clean-by-design Python project for **astroid**.

Domain: a registry of plane shapes.

## What a passing result looks like

astroid infers every name: no node resolves to `Uninferable`. There is no `exec`, no star import, no metaclass, no runtime attribute injection, no `globals()` mutation and no dynamic base class, so inference has a single answer everywhere.

## Command

```bash
python -m driver
```

Expected: `0 unresolved names`

## Layout

```text
shapebook/
  pyproject.toml      project root marker; zero dependencies
  src/shapebook/
    __init__.py
    shapes.py
    registry.py
  tests/
    test_shapebook.py
  driver.py
```

## Notes

astroid is a library, so `driver.py` drives the check. It asks whether every identifier resolves to a definition, not whether every expression infers to a value -- a first draft asked the second question and reported 8 failures in correct code, because a `dataclass(frozen=True)` decorator call and a generator expression's loop variable both infer to Uninferable quite legitimately. A check that fires on healthy code is a defect wearing a safety label. This is the axis the corpora found astroid sits on: the 3.x-to-4.x change moved `infer_call_result(caller)` to positional and deprecated the root node re-exports, so `driver.py` imports from `astroid.nodes`.
