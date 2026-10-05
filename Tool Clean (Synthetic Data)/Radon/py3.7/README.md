# Radon

**py3.7 boundary variant -- code-only.** No Python 3.7 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8). This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,7))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after downgrading builtin generic subscripting (`list[int]` etc., which needs 3.9+) to `typing.List`/`typing.Dict`/etc. It was not run against the real tool listed below.


Synthetic, clean-by-design Python project for **Radon**.

Domain: progressive payroll brackets.

## What a passing result looks like

Every block ranks **A** on cyclomatic complexity, and maintainability index ranks A. `radon cc -n B` prints nothing, because nothing is rank B or worse.

## Command

```bash
radon cc src/ -s -n B && radon mi src/ -n B
```

Expected: `(no output from either; exit 0)`

## Layout

```text
payscale/
  pyproject.toml      project root marker; zero dependencies
  src/payscale/
    __init__.py
    brackets.py
    compute.py
  tests/
    test_payscale.py
```

## Notes

Bracket arithmetic is the classic place complexity accumulates -- a chain of `elif` per band. Iterating over a table of brackets keeps every function at CC 2-3 while computing the same answer.
