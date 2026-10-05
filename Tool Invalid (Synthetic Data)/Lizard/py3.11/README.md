# Lizard

**py3.11 boundary variant -- measured.** A real Python 3.11 interpreter and
this tool's own current release were both actually installed and invoked
against this folder in the build environment; the result below is real, not
asserted.

Synthetic Python project deliberately broken for **Lizard**.

Domain: customs tariff classification by nested rule checks.

## What a failing result looks like

```text
      18      8     75      4      19 duty_rate@4-22@src/tariffcheck/rules.py
       7      1     31      1       8 flag_reason@25-32@src/tariffcheck/rules.py
      31     11    115      5      32 classify_shipment@9-40@src/tariffcheck/inspector.py
      16      7     67      4      17 inspection_tier@43-59@src/tariffcheck/inspector.py
...
Total nloc   Avg.NLOC  AvgCCN  Avg.token   Fun Cnt  Warning cnt   Fun Rt   nloc Rt
        80      18.0     6.8       72.0        4            3      0.75    0.90
```

**3 of 4 functions warn (75%, `Fun Rt 0.75`)**: `duty_rate` (CCN 8),
`classify_shipment` (CCN 11) and `inspection_tier` (CCN 7) all exceed the
CCN-5 threshold. Only `flag_reason` (CCN 1, a flat dict lookup) stays clean.

## Command

```bash
lizard src/ -C 5 -L 40 -a 3 -w
```

Tool version used: `lizard 1.24.0`.

## Layout

```text
tariffcheck/
  pyproject.toml      project root marker; zero dependencies
  src/tariffcheck/
    __init__.py
    inspector.py
    rules.py
  tests/
    test_tariffcheck.py
```

## Notes

Every input (category, weight, declared value, origin country, flag-list
membership, prior inspection count) gets its own nested `if`/`elif` branch
instead of a lookup table, so the decision count -- and CCN -- accumulates
across 2-3 levels of nesting in three of the four functions.
