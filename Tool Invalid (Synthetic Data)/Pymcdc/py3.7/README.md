# Pymcdc

**py3.7 boundary variant -- code-only.** No Python 3.7 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8). This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,7))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter (all 3 tests pass). It was not run against the real mechanism.

Synthetic, invalid-by-design Python project for **Pymcdc**.

Domain: a three-condition irrigation decision.

## What this package is designed to make the MC/DC check get wrong

Clean's version of this folder has four test cases giving each of the
three conditions its own independence pair -- full MC/DC. This one ships
only three cases, chosen so `forecast_dry` and `override_on` always change
together, so neither ever gets a clean pair on its own. On 3.13/3.14, the
identical mechanism measured for real: **MC/DC 33%** (only `moisture_low`
covered). See `py3.13/README.md` for the full breakdown and output; `src/`
and `driver.py` here are byte-for-byte identical to the measured source.

## Command

```bash
python -m driver
```

(Not run on this version -- see above.)

## Layout

```text
irrigation/
  pyproject.toml      project root marker; zero dependencies
  src/irrigation/
    __init__.py
    decision.py
  tests/
    test_decision.py
  driver.py
```

## Notes

Nothing needed to change for this version: `@dataclass(frozen=True)` and
`from __future__ import annotations` both need only 3.7+, which this
version clears, and nothing here uses builtin generic subscripting (which
needs 3.9+).
