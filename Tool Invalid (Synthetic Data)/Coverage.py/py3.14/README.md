# Coverage.py

**py3.14 boundary variant -- measured.** A real Python 3.14 interpreter and
this tool's own current release (coverage 7.16.2) were both actually
installed and invoked against this folder in the build environment; the
result below is real, not asserted.

Synthetic, deliberately-wrong Python project for **Coverage.py**.

Domain: progressive quantity discounts, shipping and coupons.

## What a wrong result looks like

The test suite is a narrow, honest smoke test of one ordinary order. It
never exercises most of the tier, shipping-region, weight-bracket or coupon
branches, so real measured statement+branch coverage comes out well under
50%.

## Command

```bash
coverage run --branch -m pytest -q && coverage report -m --fail-under=100
```

Real measured output:

```text
2 passed in 0.01s
Name                         Stmts   Miss Branch BrPart  Cover   Missing
------------------------------------------------------------------------
src/discountly/__init__.py       3      0      0      0   100%
src/discountly/coupons.py       29     21     16      1    20%   22-30, 35-39, 44-50
src/discountly/invoice.py       20      3      6      3    77%   20, 29, 31
src/discountly/shipping.py      28      7     16      6    66%   23-24, 27, 33, 43, 50, 53
src/discountly/tiers.py         32     22     26      2    24%   20-21, 24, 29-36, 41-44, 49-55
tests/test_invoice.py            7      0      0      0   100%
------------------------------------------------------------------------
TOTAL                          119     53     64     12    45%
Coverage failure: total of 45 is less than fail-under=100
```

**45% < 50%.**

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
