# vulture

Boundary-version matrix for **vulture** -- the deliberate inverse of the
Clean corpus's `vulture` folder. Where Clean's `liveedge` makes an
undirected graph where every member is reachable from another module or
from the test suite, this project (`beaconreg`) ships a maintenance module
that was written ahead of a feature that was never wired in: none of its
functions or its one class is called from the registry, from each other in
a way that reaches an external caller, or from the test suite.

| Version | Status |
|---|---|
| py3.6 | CODE-ONLY (not run against a live interpreter) |
| py3.7 | CODE-ONLY (not run against a live interpreter) |
| py3.11 | MEASURED WRONG (real vulture run) |
| py3.13 | MEASURED WRONG (real vulture run) |
| py3.14 | MEASURED WRONG (real vulture run) |

vulture's result depends only on the Python source and its own static
analysis, not on which interpreter is running it, so 3.11/3.13/3.14 were
each measured with a real, independent `vulture` invocation inside their own
folder (vulture 2.16 in every venv here) and produced identical output. The
same source needed no mechanical downgrade for 3.6/3.7: it never uses
builtin generic subscripting, `dataclasses`, or
`from __future__ import annotations`.

## Measured result (3.11 / 3.13 / 3.14, identical real vulture 2.16 runs)

```bash
vulture src/ tests/ --min-confidence 60 --ignore-names "test_*"
```

```
src/beaconreg/formatting.py:9: unused function 'format_beacon_summary' (60% confidence)
src/beaconreg/formatting.py:15: unused function 'format_beacon_debug' (60% confidence)
src/beaconreg/maintenance.py:10: unused function 'schedule_inspection' (60% confidence)
src/beaconreg/maintenance.py:15: unused function 'overdue_beacons' (60% confidence)
src/beaconreg/maintenance.py:24: unused function 'decommission_beacon' (60% confidence)
src/beaconreg/maintenance.py:32: unused class 'MaintenanceLog' (60% confidence)
src/beaconreg/maintenance.py:39: unused method 'record_visit' (60% confidence)
src/beaconreg/maintenance.py:43: unused method 'visit_count' (60% confidence)
```
vulture exits 3 (findings reported).

**Top-level functions/classes in `src/`:** `BeaconRegistry`, `register_beacon`,
`list_active_beacons`, `format_beacon_label`, `format_beacon_summary`,
`format_beacon_debug`, `schedule_inspection`, `overdue_beacons`,
`decommission_beacon`, `MaintenanceLog` -- **10 total**.

**Flagged as unused, at >=60% confidence, by the real run above:**
`format_beacon_summary`, `format_beacon_debug`, `schedule_inspection`,
`overdue_beacons`, `decommission_beacon`, `MaintenanceLog` -- **6 of 10
(60%)**.

**60% of top-level definitions are genuine, real-vulture-confirmed dead
code** -- past the 50% majority-wrong target. (The two unused methods on
`MaintenanceLog` are additional findings inside that already-dead class and
are not double-counted in the top-level ratio above.)

## Why this triggers and Clean's own `liveedge` does not

vulture's heuristic is a name-reference check, not a call-graph analysis: a
definition is "used" the moment its name is referenced anywhere vulture
scans, including by another function that is itself never called. The four
`maintenance.py` functions and the `MaintenanceLog` class never appear as a
name anywhere outside their own file (one of them, `decommission_beacon`,
even calls `format_beacon_label` from another module -- a real cross-module
reference that keeps `format_beacon_label` itself alive, while
`decommission_beacon`'s own name is still never referenced by anything, so
it is still flagged). `registry.py`'s `BeaconRegistry`,
`register_beacon` and `list_active_beacons` are referenced from
`tests/test_beaconreg.py`, which is exactly what keeps them off this list.
