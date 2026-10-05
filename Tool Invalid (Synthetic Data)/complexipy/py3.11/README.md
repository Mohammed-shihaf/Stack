# complexipy

**py3.11 boundary variant -- measured.** A real Python 3.11 interpreter and
this tool's own current release were both actually installed and invoked
against this folder in the build environment; the result below is real, not
asserted.

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
