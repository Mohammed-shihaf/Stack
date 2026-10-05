# complexipy

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists in the available build environments. This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,6))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter -- no mechanical downgrade was needed, since this fixture never uses builtin generic subscripting, `dataclasses`, or `from __future__ import annotations` in the first place. It was not run against the real tool listed below; the command and result shown are what 3.11/3.13/3.14 actually measured, reproduced here for reference only.

Synthetic Python project deliberately broken for **complexipy**.

Domain: warehouse replenishment planning by nested, boolean-heavy checks.

## What a failing result looks like

```text
src/restockplan/plan.py
    qualifies_for_rush 21  FAILED
    decide_order_quantity 34  FAILED

src/restockplan/tiers.py
    lookup_unit_cost 0  PASSED
    safety_stock_tier 27  FAILED
```

**3 of 4 functions FAIL (75%)** against the budget of 8. Only
`lookup_unit_cost`, a flat dict lookup, scores 0.

## Command

```bash
complexipy src/ --max-complexity-allowed 8
```

Tool version used: `complexipy 8.0.1`.

## Layout

```text
restockplan/
  pyproject.toml      project root marker; zero dependencies
  src/restockplan/
    __init__.py
    plan.py
    tiers.py
  tests/
    test_restockplan.py
```

## Notes

`qualifies_for_rush`, `decide_order_quantity` and `safety_stock_tier` each
nest 3-4 levels deep (stock level inside season inside lead time inside
backorder state, for example), with several nested conditions themselves
compound (`and`/`or`) rather than single comparisons -- both nesting depth
and boolean-sequence count are exactly what cognitive-complexity scoring
charges for.
