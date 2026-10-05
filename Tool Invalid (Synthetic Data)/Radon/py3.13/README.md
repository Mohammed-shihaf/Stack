# Radon

**py3.13 boundary variant -- measured.** A real Python 3.13 interpreter and this tool's own current release were both actually installed and invoked against this folder in the build environment; the result below is real, not asserted.

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
