# Pymcdc

**py3.7 boundary variant -- code-only.** No Python 3.7 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8). This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,7))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after downgrading builtin generic subscripting (`list[int]` etc., which needs 3.9+) to `typing.List`/`typing.Dict`/etc. It was not run against the real tool listed below.


Synthetic, clean-by-design Python project for **Pymcdc**.

Domain: a three-condition eligibility decision.

## What a passing result looks like

Modified condition/decision coverage reaches 100%: for every condition in the decision there is a pair of test cases in which only that condition changes and the decision outcome changes with it.

## Command

```bash
python -m driver
```

Expected: `MC/DC 100%`

## Layout

```text
eligibility/
  pyproject.toml      project root marker; zero dependencies
  src/eligibility/
    __init__.py
    decision.py
  tests/
    test_decision.py
  driver.py
```

## Notes

The decision `has_income and (is_resident or has_guarantor)` needs four cases for full MC/DC, not the eight of exhaustive truth-table coverage and not the two that branch coverage would accept. The four independence pairs are listed in `driver.py` and asserted by the tests. pymcdc installs as a library with no console script here, so `driver.py` is the entry point.
