# cognitive-ast

Boundary-version matrix for **cognitive-ast**, inverted: the
`Python-Tools-Invalid` counterpart to Clean's `cognitive-ast` folder. Where
Clean's fixture keeps every function's cognitive score at 0-2, this one is
engineered so most scored functions blow past the driver's own threshold of
15. Each `py3.X/` subfolder is a complete, independent project; see its own
README for the exact command and the real measured result. `driver.py` is
reused from Clean byte-for-byte (scoring logic untouched) except for the
same mechanical py3.6/py3.7 downgrade Clean itself applied (builtin generics
-> `typing.List`/`typing.Tuple`, no `from __future__ import annotations`);
only the fixture's own control flow was made more tangled.

| Version | Status |
|---|---|
| py3.6 | CODE-ONLY (not run against a live interpreter) |
| py3.7 | CODE-ONLY (not run against a live interpreter) |
| py3.11 | MEASURED WRONG |
| py3.13 | MEASURED WRONG |
| py3.14 | MEASURED WRONG |

## What "wrong" means here

`python -m driver` against `src/dispatchsim/`: **2 of the 3 scored functions
exceed the threshold of 15 (67%)** -- `assign_parcel_to_route` scores 33 and
`scan_pending_queue` scores 29. Only `carrier_headroom` (flat arithmetic,
score 0) stays under. The source is identical across all five version
folders (the one difference is `driver.py`'s own unrelated 3.6/3.7 syntax
downgrade, which does not touch its scoring logic).

## Why it is wrong

`assign_parcel_to_route` nests six levels deep (zone, weight, fragility,
hazmat flag, carrier availability, backlog/time-window) instead of using a
lookup table, and `scan_pending_queue` adds a nested `for` loop with its own
`break`/`continue` control flow inside an already-nested `if` chain. Both are
exactly what the driver's nesting-increment and boolean-sequence rules are
built to penalize; the scorer itself was not touched.
