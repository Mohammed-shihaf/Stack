# mutmut

Boundary-version matrix for **mutmut**, inverse corpus: each `py3.X/`
folder is a complete, independent project engineered to make a *real*
`mutmut run` report a genuinely, measurably wrong (majority-surviving)
mutation score -- not an assertion, not a mocked number.

| Version | Status |
|---|---|
| py3.6 | CODE-ONLY (not run against a live interpreter) |
| py3.7 | CODE-ONLY (not run against a live interpreter) |
| py3.11 | MEASURED WRONG -- 11 killed / 24 survived / 1 no-tests of 36 mutants |
| py3.13 | MEASURED WRONG -- 11 killed / 24 survived / 1 no-tests of 36 mutants |
| py3.14 | MEASURED WRONG -- 11 killed / 24 survived / 1 no-tests of 36 mutants |

Real `mutmut` version used: **3.8.0**.

## What "wrong" means here

The source (`stocklevel`, inventory reorder thresholds, stock adjustment
and a status label) is ordinary, branching code. The test suite
(`test_stocklevel.py`) is a real, passing suite, but a defensibly weak one:
every test checks only one branch of its function and uses a loose
assertion instead of an exact expected value --

- `needs_reorder`: only the true case is checked, with no exact boundary.
- `reorder_quantity`: only `> 0`, never the exact quantity, and the "no
  reorder needed" branch is never called.
- `reorder_urgency`: the assertion is `in (...)` over all four possible
  labels, so a mutant that changes *which* label comes back still passes.
- `apply_adjustment`: only `>= 0`, never the exact clamped or unclamped
  value, and the clamping branch itself is never exercised.
- `clamp_to_capacity`: only `<= capacity`, never the exact value, and the
  over-capacity branch is never exercised.
- `stock_status`: only the "ok" branch is checked; "low" and "full" never
  run.
- `net_change` is never called at all.

This is a real, legitimate smoke-test style suite -- it is simply checking
far less than the full behavior surface, exactly the kind of gap
`mutmut`'s mutation score is designed to surface.

## Command

```bash
mutmut run && mutmut results
```

Real measured output (identical across py3.11 / py3.13 / py3.14, same
source and same `mutmut` version in every venv):

```text
36/36  [killed] 11 [no-tests] 1  [timeout] 0  [suspicious] 0  [survived] 24  [skipped] 0  [check] 0
```

([killed] = killed, [no-tests] = no tests ran against it, [survived] = survived)

**11 killed of 36 total = 30.6% killed.** Of the remaining 25: 24 genuinely
survived (66.7% of all mutants) and 1 had no covering test at all
(`no-tests`, 2.8%) -- combined, **69.4% of mutants were not killed**, well
past the 50%-survival target either way the remainder is sliced. `mutmut
results` lists all 24 survivors plus the one untested mutant by name, e.g.
`stocklevel.status.x_stock_status__mutmut_1: survived`.

## Layout

```text
stocklevel/
  pyproject.toml      project root marker; zero dependencies
  setup.cfg            [mutmut] source_paths, since mutmut 3.x ignores pyproject.toml
  src/stocklevel/
    __init__.py
    reorder.py          needs_reorder, reorder_quantity, reorder_urgency
    adjust.py            apply_adjustment, clamp_to_capacity, net_change
    status.py             stock_status
  tests/
    test_stocklevel.py    one weak, loose-assertion test per function
```

## Notes

The source uses no builtin generic subscripting, no `dataclasses`, and no
`from __future__ import annotations` -- nothing in it has a floor above
Python 3.6, so the same source and the same measured mutation score apply
unchanged across every version folder, including the code-only 3.6/3.7
ones.
