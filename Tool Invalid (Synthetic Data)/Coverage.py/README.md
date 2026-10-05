# Coverage.py

Boundary-version matrix for **Coverage.py**, inverse corpus: each `py3.X/`
folder is a complete, independent project engineered to make a *real*
`coverage` run report a genuinely, measurably wrong (majority-uncovered)
result -- not an assertion, not a mocked number.

| Version | Status |
|---|---|
| py3.6 | CODE-ONLY (not run against a live interpreter) |
| py3.7 | CODE-ONLY (not run against a live interpreter) |
| py3.11 | MEASURED WRONG -- `coverage report`: **45%** (54/119 lines+branches) |
| py3.13 | MEASURED WRONG -- `coverage report`: **45%** (54/119 lines+branches) |
| py3.14 | MEASURED WRONG -- `coverage report`: **45%** (54/119 lines+branches) |

Real `coverage` version used: **7.16.2**.

## What "wrong" means here

The source (`discountly`, a progressive-quantity-discount pricing package:
tiers, shipping brackets, coupon codes, invoice total) is deliberately large
relative to the test suite: the suite is a narrow, honest smoke test of one
ordinary order through `total_cents`, plus one `is_order_valid` check. It
never calls `tier_label`, `next_tier_threshold`, `tier_span`,
`is_stackable`, `describe_savings`, most of the coupon branches, the
region-rejection branch, or most weight/tier brackets. Both tests pass --
this is a real, legitimate test suite that is simply far from exhaustive,
the same kind of gap a hurried team ships and `--fail-under=100` is meant to
catch.

## Command

```bash
coverage run --branch -m pytest -q && coverage report -m --fail-under=100
```

Real measured output (identical across py3.11 / py3.13 / py3.14, same
source and same `coverage`/`pytest` versions in every venv):

```text
..                                                                       [100%]
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

45% is well under the 50% threshold this corpus targets.

## Layout

```text
discountly/
  pyproject.toml      project root marker; zero dependencies
  src/discountly/
    __init__.py
    tiers.py           quantity discount tier lookup
    shipping.py        weight/region/expedited shipping cost
    coupons.py         flat and percent coupon codes
    invoice.py         combines the above into one order total
  tests/
    test_invoice.py    one ordinary order, nothing exotic
```

## Notes

The source uses no builtin generic subscripting, no `dataclasses`, and no
`from __future__ import annotations` -- nothing in it has a floor above
Python 3.6, so the same source and the same measured gap apply unchanged
across every version folder, including the code-only 3.6/3.7 ones.
