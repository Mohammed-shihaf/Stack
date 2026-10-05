# Pymcdc

**py3.14 boundary variant.** MEASURED WRONG: the real MC/DC check this corpus's own driver performs genuinely reports well under half of the decision's conditions covered.

Synthetic, invalid-by-design Python project for **Pymcdc** -- the deliberate inverse of the Clean corpus's `eligibility`.

Domain: a three-condition irrigation decision.

## What's wrong here, and why it's genuine

Clean's version of this folder has four test cases chosen so each of the
decision's three conditions gets its own independence pair -- two cases
differing in exactly that one condition, with a differing outcome -- which
is full MC/DC. This project keeps the exact same checking mechanism
(`has_independence_pair`, unchanged from Clean's driver) but ships only
**three** test cases, chosen so that `forecast_dry` and `override_on`
always change together whenever either changes:

```text
moisture_low=True,  forecast_dry=True,  override_on=False  -> True
moisture_low=False, forecast_dry=True,  override_on=False  -> False
moisture_low=True,  forecast_dry=False, override_on=True   -> True
```

Case 1 vs. case 2 isolates `moisture_low` cleanly (the only other value,
`forecast_dry`, stays fixed), so that condition gets its independence pair.
But every pair that could test `forecast_dry` or `override_on` also changes
the other condition at the same time, so neither ever gets a clean pair.
This isn't a trick on the checker -- it's a real, common test-suite gap:
three "plausible-looking" cases that happen to never isolate two of the
three conditions.

## Command

```bash
python -m driver
```

Measured: **MC/DC 33%**, exit 1.

```text
  moisture_low: covered
  forecast_dry: UNCOVERED
  override_on: UNCOVERED
MC/DC 33%
```

Interpreter: CPython 3.14.0rc2 (Pymcdc has no PyPI package; this is the
corpus's own hand-written, stdlib-based MC/DC scoring mechanism, run as-is
from Clean's driver).

## Layout

```text
irrigation/
  pyproject.toml      project root marker; zero dependencies
  src/irrigation/
    __init__.py
    decision.py          the decision driver.py checks
  tests/
    test_decision.py      the same three cases, all assertions pass
  driver.py
```

## Notes

All three tests pass -- the decision function itself is correct for every
case exercised; the defect is entirely in the *test suite's* choice of
cases, which is exactly what MC/DC is designed to catch and exactly what
this project makes it catch.
