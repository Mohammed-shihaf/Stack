# Pymcdc

Boundary-version matrix for **Pymcdc**, the deliberate inverse of the Clean
corpus's `eligibility`: 2 earliest supported versions, 1 middle, 2
end/latest -- matching the Clean corpus's own version-coverage methodology.
Each `py3.X/` subfolder is a complete, independent project; see its own
README for exactly what's wrong and the command.

| Version | Status |
|---|---|
| py3.6 | CODE-ONLY (not run against a live interpreter) |
| py3.7 | CODE-ONLY (not run against a live interpreter) |
| py3.11 | MEASURED WRONG -- MC/DC 33% |
| py3.13 | MEASURED WRONG -- MC/DC 33% |
| py3.14 | MEASURED WRONG -- MC/DC 33% |

3.6 and 3.7 are code-only (see their own READMEs). 3.11, 3.13 and 3.14 were
each measured for real using the corpus's own hand-written, stdlib-based
MC/DC scoring mechanism (there is no PyPI package named `pymcdc`), with
identical source and identical results.

## What's wrong here

A three-condition irrigation decision (`moisture_low and (forecast_dry or
override_on)`) exercised by only three test cases instead of the four full
MC/DC needs. The three cases isolate `moisture_low` cleanly, but
`forecast_dry` and `override_on` always change together whenever either
changes, so neither ever gets a clean independence pair. `driver.py` reuses
Clean's exact mechanism unchanged (`has_independence_pair`: two cases
differing in one condition alone, with differing outcomes) over this
project's own condition/case set, and it genuinely reports **MC/DC 33%** --
only one of three conditions covered, not the eight exhaustive truth-table
cases and not the four full-MC/DC cases. All three tests pass: the defect
is in the test suite's choice of cases, not in the decision logic or in a
broken checker.
