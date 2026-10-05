# vulture

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8). This source needed **no mechanical downgrade**: it never uses builtin generic subscripting, `dataclasses`, or `from __future__ import annotations`, so it is reused byte-for-byte from the baseline. Verified instead by `ast.parse(source, feature_version=(3,6))` on every file (passes) and by this folder's own pytest suite running unmodified and green under an available interpreter (2 passed). Not run against the real tool.


Synthetic, invalid-by-design Python project for **vulture** -- the inverse
of Clean's `liveedge`.

Domain: a lighthouse beacon registry (`registry.py`, wired up and tested)
alongside a maintenance module (`maintenance.py`) written ahead of a
feature that was never finished wiring in.

## What a wrong result looks like

vulture, run for real against `src/` and `tests/` on the measured versions
(py3.11/13/14 -- see their READMEs), flags **6 of 10 (60%)** of the
project's top-level functions and classes as unused at >=60% confidence.
Not run here.

## Command

```bash
vulture src/ tests/ --min-confidence 60 --ignore-names "test_*"
```

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
`format_beacon_label`. Nothing in `src/` or `tests/` calls into
`maintenance.py`, and `format_beacon_summary` / `format_beacon_debug` are
reporting helpers nobody wired up yet either.
