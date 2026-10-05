# CrossHair

**py3.11 boundary variant -- the corpus's original middle version.** Measured clean or documented not-installed exactly as recorded in this corpus's very first build; unchanged by the later boundary-version work.


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
