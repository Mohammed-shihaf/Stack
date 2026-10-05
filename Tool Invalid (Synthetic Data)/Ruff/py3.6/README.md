# Ruff

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists in the available build environments. This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,6))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter -- no mechanical downgrade was needed, since this fixture never uses builtin generic subscripting, `dataclasses`, or `from __future__ import annotations` in the first place. It was not run against the real tool listed below; the command and result shown are what 3.11/3.13/3.14 actually measured, reproduced here for reference only.

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
