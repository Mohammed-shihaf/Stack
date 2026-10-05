# Radon

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists in the available build environments. This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,6))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter -- no mechanical downgrade was needed, since this fixture never uses builtin generic subscripting, `dataclasses`, or `from __future__ import annotations` in the first place. It was not run against the real tool listed below; the command and result shown are what 3.11/3.13/3.14 actually measured, reproduced here for reference only.

Synthetic Python project deliberately broken for **Radon**.

Domain: support-ticket routing by nested signal checks.

## What a failing result looks like

`radon cc src/ -s` prints every block's rank (no `-n` filter). **3 of 4
blocks rank C or worse (75%)**:

```text
src/triageroute/router.py
    F 9:0 classify_ticket - D (25)
    F 56:0 escalate_check - C (13)
src/triageroute/scoring.py
    F 4:0 risk_score - D (22)
    F 42:0 normalize_tier - A (2)
```

Only `normalize_tier` (a one-line dict-membership check) stays at A.

## Command

```bash
radon cc src/ -s
```

Tool version used: `radon 6.0.1`.

## Layout

```text
triageroute/
  pyproject.toml      project root marker; zero dependencies
  src/triageroute/
    __init__.py
    router.py
    scoring.py
  tests/
    test_triageroute.py
```

## Notes

Every signal (category, priority, keyword membership, SLA-breach state,
customer tier, retry count) gets its own nested `if`/`elif`, several with
compound `and`/`or` conditions, instead of a lookup table -- the opposite of
the bracket-table trick Clean's own `payscale` fixture uses to stay flat.
