# SlipCover

**py3.13 boundary variant -- measured.** A real Python 3.13 interpreter and
this tool's own current release (slipcover 1.1.0) were both actually
installed and invoked against this folder in the build environment; the
result below is real, not asserted.

Synthetic, deliberately-wrong Python project for **SlipCover**.

Domain: plain-text tokenizing and a word-frequency histogram.

## What a wrong result looks like

The test suite is a narrow, honest smoke test: one punctuation-free
sentence tokenized, one literal list histogrammed. `stats.py` is entirely
untested (0%), and most of `tokenize.py`'s punctuation/stopword handling
and `histogram.py`'s bucketing/merging are never exercised.

## Command

```bash
slipcover --source src -m pytest -q
```

Real measured output:

```text
2 passed, 1 warning in 0.01s

File                         #lines    #l.miss    Cover%  Missing
-------------------------  --------  ---------  --------  --------------------------
src/lexihist/__init__.py          4          0       100
src/lexihist/histogram.py        27         15        44  17-21, 26-27, 32-35, 40-43
src/lexihist/stats.py            25         25         0  1-37
src/lexihist/tokenize.py         29          9        69  13, 15, 26, 41-46
---
(summary)                        85         49        42
```

**42% < 50%.**

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
