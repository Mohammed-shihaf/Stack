# mutmut

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists
in the available build environments. This source is verified, not
asserted: `ast.parse(..., feature_version=(3, 6))` passes, and this
folder's own pytest suite runs unmodified and green under an available
interpreter. It was not run against the real tool.

No mechanical downgrade was needed for this folder: the source uses no
builtin generic subscripting, no `dataclasses`, and no
`from __future__ import annotations` -- nothing in it has a floor above
Python 3.6, so it is byte-for-byte identical to the py3.11/py3.13/py3.14
source.

Synthetic, deliberately-wrong Python project for **mutmut**.

Domain: inventory stock-level thresholds, adjustments and status.

## What a wrong result would look like

Every test checks only one branch with a loose assertion, and one function
is never called. On every live-measured version (py3.11/py3.13/py3.14,
identical source) this comes out to a real mutmut score of **11 killed /
36 total (30.6% killed, 69.4% survived)** -- well past the 50%-survival
target. There is no reason to expect a different number on 3.6
since nothing in the source or tests is version-dependent.

## Command (not run here)

```bash
mutmut run && mutmut results
```

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
