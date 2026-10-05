# mutmut

**py3.13 boundary variant -- measured.** A real Python 3.13 interpreter and
this tool's own current release (mutmut 3.8.0) were both actually
installed and invoked against this folder in the build environment; the
result below is real, not asserted.

Synthetic, deliberately-wrong Python project for **mutmut**.

Domain: inventory stock-level thresholds, adjustments and status.

## What a wrong result looks like

Every test in the suite checks only one branch of its function with a
loose assertion (an `in (...)` membership, a `>= 0` bound, a `> 0`
bound) instead of an exact expected value, and one function
(`net_change`) is never called at all. Both tests pass, but most mutants
-- flipped comparisons, changed constants, swapped operators -- land
inside that slack and survive.

## Command

```bash
mutmut run && mutmut results
```

Real measured output:

```text
36/36  [killed] 11 [no-tests] 1  [timeout] 0  [suspicious] 0  [survived] 24  [skipped] 0  [check] 0
```

**11 killed of 36 = 30.6% killed, 69.4% survived.**

## Layout

```text
stocklevel/
  pyproject.toml
  setup.cfg
  src/stocklevel/
    __init__.py
    reorder.py
    adjust.py
    status.py
  tests/
    test_stocklevel.py
```
