# Coverage.py

**py3.7 boundary variant -- code-only.** No Python 3.7 interpreter exists
in the available build environments. This source is verified, not
asserted: `ast.parse(..., feature_version=(3, 7))`
passes, and this folder's own pytest suite runs unmodified and green under
an available interpreter. It was not run against the real tool.

No mechanical downgrade was needed for this folder: the source uses no
builtin generic subscripting (`list[int]`), no `dataclasses`, and no
`from __future__ import annotations` -- nothing in it has a floor above
Python 3.6, so it is byte-for-byte identical to the py3.11/py3.13/py3.14
source.

Synthetic, deliberately-wrong Python project for **Coverage.py**.

Domain: progressive quantity discounts, shipping and coupons.

## What a wrong result would look like

The test suite is a narrow, honest smoke test of one ordinary order; it
never exercises most of the tier, shipping-region, weight-bracket or coupon
branches. On every live-measured version (py3.11/py3.13/py3.14, identical
source) this comes out to real `coverage report` of **45%** -- well under
the 50% target. There is no reason to expect a different number on 3.3.7
since nothing in the source or tests is version-dependent.

## Command (not run here)

```bash
coverage run --branch -m pytest -q && coverage report -m --fail-under=100
```

## Layout

```text
discountly/
  pyproject.toml
  src/discountly/
    __init__.py
    tiers.py
    shipping.py
    coupons.py
    invoice.py
  tests/
    test_invoice.py
```
