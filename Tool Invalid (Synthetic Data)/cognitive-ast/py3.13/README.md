# cognitive-ast

**py3.13 boundary variant -- measured.** `driver.py` was actually run against this folder in the build environment under a real Python 3.13 interpreter; the result below is real, not asserted.

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
