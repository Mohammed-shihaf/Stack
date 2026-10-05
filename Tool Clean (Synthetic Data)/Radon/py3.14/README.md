# Radon

**py3.14 boundary variant -- measured (interpreter pinned to 3.14.0rc2, matching this project's convention elsewhere).** A real Python 3.14 interpreter and this tool's own current release were both actually installed and invoked against this folder in the build environment; the result below is real, not asserted.


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
