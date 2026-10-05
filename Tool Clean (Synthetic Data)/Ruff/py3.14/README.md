# Ruff

**py3.14 boundary variant -- measured (interpreter pinned to 3.14.0rc2, matching this project's convention elsewhere).** A real Python 3.14 interpreter and this tool's own current release were both actually installed and invoked against this folder in the build environment; the result below is real, not asserted.


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
