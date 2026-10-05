# Radon

Boundary-version matrix for **Radon**, inverted: this is the
`Python-Tools-Invalid` counterpart to the Clean corpus's `Radon` folder.
Where Clean's fixture is engineered so every block ranks A, this one is
engineered so most blocks do not. Each `py3.X/` subfolder is a complete,
independent project; see its own README for the exact command and the real
measured result.

| Version | Status |
|---|---|
| py3.6 | CODE-ONLY (not run against a live interpreter) |
| py3.7 | CODE-ONLY (not run against a live interpreter) |
| py3.11 | MEASURED WRONG |
| py3.13 | MEASURED WRONG |
| py3.14 | MEASURED WRONG |

## What "wrong" means here

`radon cc src/ -s` (no `-n` filter, so every block prints) against
`src/triageroute/`: **3 of the 4 scored blocks rank C or worse (75%)** --
`classify_ticket` and `risk_score` both rank **D**, `escalate_check` ranks
**C**. Only `normalize_tier` stays at **A**. The source is the same across
3.11/3.13/3.14 (and, code-only, 3.6/3.7): nothing about cyclomatic-complexity
counting is version-sensitive, so one fixture serves all five.

## Why it is wrong

`classify_ticket` and `escalate_check` (in `router.py`) and `risk_score` (in
`scoring.py`) each resolve a routing or scoring decision by walking every
input signal (category, priority, keyword membership, SLA-breach flag,
customer tier, retry count) through its own nested `if`/`elif` chain, with
compound `and`/`or` conditions at several of the nesting levels, instead of
through a flat lookup table. Each nested branch and each boolean operator is
its own decision point, so the cyclomatic complexity accumulates exactly the
way Clean's own `payscale` fixture (its "Notes" section) says a bracket-style
chain of `elif` does -- just leaned into instead of avoided.
