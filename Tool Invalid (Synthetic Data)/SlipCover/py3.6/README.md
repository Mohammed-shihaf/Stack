# SlipCover

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

Synthetic, deliberately-wrong Python project for **SlipCover**.

Domain: plain-text tokenizing and a word-frequency histogram.

## What a wrong result would look like

The test suite is a narrow, honest smoke test: one punctuation-free
sentence tokenized, one literal list histogrammed. `stats.py` is entirely
untested and most of the punctuation/stopword/bucketing logic is never
exercised. On every live-measured version (py3.11/py3.13/py3.14, identical
source) this comes out to a real slipcover summary of **42%** -- well under
the 50% target. There is no reason to expect a different number on 3.6
since nothing in the source or tests is version-dependent.

## Command (not run here)

```bash
slipcover --source src -m pytest -q
```

## Layout

```text
lexihist/
  pyproject.toml
  src/lexihist/
    __init__.py
    tokenize.py
    histogram.py
    stats.py
  tests/
    test_basic.py
```
