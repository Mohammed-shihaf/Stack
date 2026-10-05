# vulture

**py3.11 boundary variant.** Measured for real in this build: vulture 2.16 was invoked against this folder's own source and tests.

Synthetic, invalid-by-design Python project for **vulture** -- the inverse
of Clean's `liveedge`.

Domain: a lighthouse beacon registry (`registry.py`, wired up and tested)
alongside a maintenance module (`maintenance.py`) written ahead of a
feature that was never finished wiring in.

## What a wrong result looks like

vulture, run for real against `src/` and `tests/`, flags a majority of the
project's top-level functions and classes as unused.

## Command

```bash
vulture src/ tests/ --min-confidence 60 --ignore-names "test_*"
```

## Real result (this version)

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
vulture exits 3.

**10 top-level definitions in `src/`, 6 flagged unused at >=60% confidence
= 60% genuinely dead code** (`format_beacon_summary`, `format_beacon_debug`,
`schedule_inspection`, `overdue_beacons`, `decommission_beacon`,
`MaintenanceLog`) -- past the 50% majority-wrong target, from a real run of
real vulture 2.16.

## Layout

```text
beaconreg/
  pyproject.toml      project root marker; zero dependencies
  src/beaconreg/
    __init__.py
    registry.py         BeaconRegistry, register_beacon, list_active_beacons -- all referenced
    formatting.py       format_beacon_label (referenced); format_beacon_summary, format_beacon_debug (dead)
    maintenance.py       schedule_inspection, overdue_beacons, decommission_beacon, MaintenanceLog -- all dead
  tests/
    test_beaconreg.py
```

## Notes

`tests/test_beaconreg.py` exercises `BeaconRegistry`, `register_beacon`,
`list_active_beacons` and (transitively, through `register_beacon`)
`format_beacon_label` -- the four referenced definitions. Nothing in
`src/` or `tests/` calls into `maintenance.py`, and `format_beacon_summary`
/ `format_beacon_debug` are reporting helpers nobody wired up yet either.
