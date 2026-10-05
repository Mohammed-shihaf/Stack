# Lizard

Boundary-version matrix for **Lizard**, inverted: the `Python-Tools-Invalid`
counterpart to Clean's `Lizard` folder. Where Clean's fixture prints no
warnings, this one is engineered so most functions exceed the CCN threshold.
Each `py3.X/` subfolder is a complete, independent project; see its own
README for the exact command and the real measured result.

| Version | Status |
|---|---|
| py3.6 | CODE-ONLY (not run against a live interpreter) |
| py3.7 | CODE-ONLY (not run against a live interpreter) |
| py3.11 | MEASURED WRONG |
| py3.13 | MEASURED WRONG |
| py3.14 | MEASURED WRONG |

## What "wrong" means here

`lizard src/ -C 5 -L 40 -a 3` against `src/tariffcheck/`: **3 of the 4
functions found exceed CCN 5 (75%, lizard's own `Fun Rt 0.75`)** --
`duty_rate` (CCN 8), `classify_shipment` (CCN 11) and `inspection_tier`
(CCN 7) all warn; only `flag_reason`, a flat dict lookup, stays under
threshold. The source is identical across all five version folders: nothing
about cyclomatic-complexity counting is version-sensitive.

## Why it is wrong

`classify_shipment`, `inspection_tier` and `duty_rate` each resolve their
result by nesting a separate `if`/`elif` per input (shipment category,
weight, declared value, origin country, flagged-country membership, prior
inspection count) instead of a flat table, so the decision count -- and
Lizard's CCN -- piles up across 2-3 levels of nesting in every one of them.
