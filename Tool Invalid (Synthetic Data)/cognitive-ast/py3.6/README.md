# cognitive-ast

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists in the available build environments. This source (including `driver.py`) is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,6))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after downgrading `driver.py`'s own builtin generic subscripting (`list[tuple[...]]`) to `typing.List`/`typing.Tuple` and removing its `from __future__ import annotations` line (needs 3.7+) -- the exact same mechanical change Clean applied to this same file, with the scoring logic untouched. The fixture's own src/ never used generics, dataclasses or future-annotations to begin with. It was not run against the real driver below; the command and result shown are what 3.11/3.13/3.14 actually measured, reproduced here for reference only.

Synthetic Python project deliberately broken for **cognitive-ast**.

Domain: fulfillment-center dispatch simulation with deeply nested routing.

## What a failing result looks like

```text
src/dispatchsim/queue_assign.py:10 assign_parcel_to_route scores 33
src/dispatchsim/queue_assign.py:43 scan_pending_queue scores 29
max cognitive score 33 (threshold 15)
```

**2 of the 3 scored functions exceed the threshold of 15 (67%)**. Only
`carrier_headroom` (flat arithmetic, score 0) stays under.

## Command

```bash
python -m driver
```

Exit code: `1` (the driver's own `main()` returns 1 whenever the worst score
exceeds the threshold).

## Layout

```text
dispatchsim/
  pyproject.toml      project root marker; zero dependencies
  src/dispatchsim/
    __init__.py
    queue_assign.py
    capacity.py
  tests/
    test_dispatchsim.py
  driver.py
```

## Notes

`assign_parcel_to_route` nests six levels deep (zone, weight, fragility,
hazmat flag, carrier availability, backlog/time-window) instead of using a
lookup table, and `scan_pending_queue` adds a nested `for` loop with its own
`break`/`continue` control flow inside an already-nested `if` chain. The
scorer in `driver.py` is reused unchanged from Clean's own build; only the
fixture's control flow was made more tangled.
