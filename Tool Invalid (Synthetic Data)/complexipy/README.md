# complexipy

Boundary-version matrix for **complexipy**, inverted: the
`Python-Tools-Invalid` counterpart to Clean's `complexipy` folder. Where
Clean's fixture keeps every function within budget, this one is engineered
so most functions blow past it. Each `py3.X/` subfolder is a complete,
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

`complexipy src/ --max-complexity-allowed 8` against `src/restockplan/`:
**3 of the 4 functions found exceed cognitive complexity 8 (75%)** --
`qualifies_for_rush` scores 21, `decide_order_quantity` scores 34, and
`safety_stock_tier` scores 27, all printed `FAILED`. Only `lookup_unit_cost`
(a flat dict lookup, score 0) `PASSED`. The source is identical across all
five version folders: cognitive-complexity scoring has no Python-version
sensitivity.

## Why it is wrong

Each of the three failing functions nests its decision 3-4 levels deep (stock
level inside season inside lead time inside backorder state, for example)
instead of flattening the checks, and several of the nested conditions are
themselves compound (`and`/`or`) rather than single comparisons -- both of
which are exactly the increments cognitive-complexity scoring is built to
punish.
