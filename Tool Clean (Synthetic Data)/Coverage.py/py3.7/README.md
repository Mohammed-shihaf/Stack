# Coverage.py

**py3.7 boundary variant -- code-only.** No Python 3.7 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8). This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,7))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after downgrading builtin generic subscripting (`list[int]` etc., which needs 3.9+) to `typing.List`/`typing.Dict`/etc. It was not run against the real tool listed below.


Synthetic, clean-by-design Python project for **Coverage.py**.

Domain: conversion between temperature scales.

## What a passing result looks like

100% statement **and** branch coverage. Every conditional is exercised on both arms, so `coverage report` shows no partial branches and no missing lines.

## Command

```bash
coverage run --branch -m pytest -q && coverage report -m --fail-under=100
```

Expected: `TOTAL ... 100%`

## Layout

```text
thermo/
  pyproject.toml      project root marker; zero dependencies
  src/thermo/
    __init__.py
    convert.py
    describe.py
  tests/
    test_convert.py
    test_describe.py
```

## Notes

`--branch` is the point of this folder: statement coverage alone can read 100% while one side of a conditional never runs. `--fail-under` turns the claim into an exit code.
