# Pymcdc

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8). This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,6))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter (all 3 tests pass -- the decision function is correct; the gap is in the test cases' coverage, not their assertions). It was not run against the real mechanism.

Synthetic, invalid-by-design Python project for **Pymcdc**.

Domain: a three-condition irrigation decision.

## What this package is designed to make the MC/DC check get wrong

Clean's version of this folder has four test cases giving each of the
three conditions its own independence pair -- full MC/DC. This one ships
only three cases, chosen so `forecast_dry` and `override_on` always change
together, so neither ever gets a clean pair on its own. On 3.13/3.14, the
identical mechanism measured for real: **MC/DC 33%** (only `moisture_low`
covered). See `py3.13/README.md` for the full breakdown and output; the
decision logic and the three test cases are identical here.

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

Two mechanical changes for this version: the `@dataclass(frozen=True)`
`FieldState` was rewritten to a plain class with an explicit `__init__`
(audited: nothing in this folder compares, hashes, or introspects a
`FieldState` instance via `dataclasses.fields`/`asdict`/`replace`, so a
plain class is behavior-preserving -- proved by the unmodified test suite
passing after the swap, not assumed); and `driver.py`'s `from __future__
import annotations` (3.7+) was dropped, since it guarded no builtin generic
subscripting that needed rewriting in turn.
