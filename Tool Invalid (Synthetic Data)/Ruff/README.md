# Ruff

Boundary-version matrix for **Ruff**, inverted: the `Python-Tools-Invalid`
counterpart to Clean's `Ruff` folder. Where Clean's fixture reports zero
diagnostics under the same broad rule selection, this one is engineered so
most functions trigger a real one. Each `py3.X/` subfolder is a complete,
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

`ruff check src/ tests/` against `src/logbundle/`, under the same rule
selection Clean uses (`E, W, F, I, N, UP, B, C4, SIM, D`): **7 real
diagnostics across 5 of the 6 functions in `src/` (83%)** -- `F401` (unused
import), `B006` (mutable default argument), `E722` (bare `except`), `F841`
(unused local variable), `B007` (unused loop variable), `F541` (f-string
with no placeholder), and `N802` (non-lowercase function name). None are
suppressed with `# noqa`. `ruff format --check` passes cleanly (the fixture
is deliberately lint-broken, not merely unformatted, so the two checks stay
independent signals). The source is identical across all five version
folders.

## Why it is wrong

Each of 5 functions carries one planted, genuine defect of a kind Ruff's
selected rule set actually catches: a shared mutable default argument, a
bare `except:`, an unused local variable alongside an unused loop variable,
an `f`-prefixed string with nothing to interpolate, and a function name that
breaks `snake_case`. The 6th function (`parse_log_line`) and the module's own
unused `json` import round out the count.
