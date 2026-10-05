# Ruff

**py3.13 boundary variant -- measured.** A real Python 3.13 interpreter and this tool's own current release were both actually installed and invoked against this folder in the build environment; the result below is real, not asserted.

Synthetic Python project deliberately broken for **Ruff**.

Domain: log-entry parsing and summarisation.

## What a failing result looks like

`ruff check src/ tests/` reports **7 diagnostics across 5 of the 6 functions
in `src/` (83%)**:

```text
F401  `json` imported but unused                (module level, ingest.py)
B006  mutable default argument                  parse_entries
E722  bare `except`                              load_batch
F841  unused local variable `error_total`        summarize
B007  unused loop variable `entry`               summarize
F541  f-string without any placeholders          tag_entries
N802  function name `Normalize_Name` not lowercase Normalize_Name
```

Only `parse_log_line` is clean. `ruff format --check src/ tests/` passes (4
files already formatted) -- the fixture is lint-broken, not merely
unformatted.

## Command

```bash
ruff check src/ tests/ && ruff format --check src/ tests/
```

Tool version used: `ruff 0.16.10`.

## Layout

```text
logbundle/
  pyproject.toml      project root marker; zero dependencies
  src/logbundle/
    __init__.py
    ingest.py
    report.py
  tests/
    test_logbundle.py
  ruff.toml
```

## Notes

No `# noqa` appears anywhere -- every diagnostic above is a real, unsuppressed
finding. The rule selection is the same broad set Clean uses
(pycodestyle, pyflakes, isort, pep8-naming, pyupgrade, bugbear,
comprehensions, simplify, pydocstyle), so the contrast with Clean's
zero-diagnostic result is apples to apples.
