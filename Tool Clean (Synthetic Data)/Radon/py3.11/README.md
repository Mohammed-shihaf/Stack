# Radon

**py3.11 boundary variant -- the corpus's original middle version.** Measured clean or documented not-installed exactly as recorded in this corpus's very first build; unchanged by the later boundary-version work.


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
