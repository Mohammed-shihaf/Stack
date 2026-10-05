# Ruff

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8), and most of this tool's current releases no longer install on an interpreter that old anyway. This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,6))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after the mechanical 3.6 downgrade (builtin generics -> typing.X, no stdlib `dataclasses`, no `from __future__ import annotations`). It was not run against the real tool listed below.


Synthetic, clean-by-design Python project for **Ruff**.

Domain: a layered settings loader.

## What a passing result looks like

`ruff check` reports no diagnostics under a broad rule selection (pycodestyle, pyflakes, isort, pep8-naming, pyupgrade, bugbear, comprehensions, simplify, pydocstyle), and `ruff format --check` reports the files already formatted.

## Command

```bash
ruff check src/ tests/ && ruff format --check src/ tests/
```

Expected: `All checks passed! / N files already formatted`

## Layout

```text
tidyconf/
  pyproject.toml      project root marker; zero dependencies
  src/tidyconf/
    __init__.py
    layers.py
    parse.py
  tests/
    test_tidyconf.py
  ruff.toml
```

## Notes

The selected rule set is written into `pyproject.toml` under `[tool.ruff.lint]`, so the result is reproducible rather than dependent on whatever Ruff's defaults are on the day. Passing Ruff's default four rules would prove very little.
