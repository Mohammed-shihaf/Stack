# Coverage.py

**py3.13 boundary variant -- measured.** A real Python 3.13 interpreter and this tool's own current release were both actually installed and invoked against this folder in the build environment; the result below is real, not asserted.


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
