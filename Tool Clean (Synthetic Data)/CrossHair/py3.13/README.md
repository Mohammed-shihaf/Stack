# CrossHair

**py3.13 boundary variant -- measured.** A real Python 3.13 interpreter and this tool's own current release were both actually installed and invoked against this folder in the build environment; the result below is real, not asserted.


Synthetic, clean-by-design Python project for **CrossHair**.

Domain: closed integer intervals.

## What a passing result looks like

CrossHair finds no counterexample. Every function carries a docstring `pre:`/`post:` contract that holds for all inputs satisfying its precondition.

## Command

```bash
crosshair check src/spanmath --per_condition_timeout=15
```

Expected: `(no output; exit 0)`

## Layout

```text
spanmath/
  pyproject.toml      project root marker; zero dependencies
  src/spanmath/
    __init__.py
    span.py
  tests/
    test_span.py
```

## Notes

Contracts are written as docstring `pre:` / `post:` lines rather than `assert`, so the same files stay clean under Bandit B101. Functions are total over their preconditions and use only integer arithmetic, which keeps CrossHair's solver inside a range it can decide.
