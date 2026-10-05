# astroid

**py3.14 boundary variant -- measured (interpreter pinned to 3.14.0rc2, matching this project's convention elsewhere).** A real Python 3.14 interpreter and this tool's own current release were both actually installed and invoked against this folder in the build environment; the result below is real, not asserted.


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
