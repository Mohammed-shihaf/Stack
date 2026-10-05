# Pymcdc

**py3.13 boundary variant -- measured.** A real Python 3.13 interpreter and this tool's own current release were both actually installed and invoked against this folder in the build environment; the result below is real, not asserted.


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
