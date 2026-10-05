# Ruff

**py3.11 boundary variant -- the corpus's original middle version.** Measured clean or documented not-installed exactly as recorded in this corpus's very first build; unchanged by the later boundary-version work.


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
