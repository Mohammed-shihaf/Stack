# SlipCover

Boundary-version matrix for **SlipCover**, inverse corpus: each `py3.X/`
folder is a complete, independent project engineered to make a *real*
`slipcover` run report a genuinely, measurably wrong (majority-uncovered)
result -- not an assertion, not a mocked number.

| Version | Status |
|---|---|
| py3.6 | CODE-ONLY (not run against a live interpreter) |
| py3.7 | CODE-ONLY (not run against a live interpreter) |
| py3.11 | MEASURED WRONG -- slipcover summary: **42%** (36/85 lines) |
| py3.13 | MEASURED WRONG -- slipcover summary: **42%** (36/85 lines) |
| py3.14 | MEASURED WRONG -- slipcover summary: **42%** (36/85 lines) |

Real `slipcover` version used: **1.1.0**.

## What "wrong" means here

The source (`lexihist`, a plain-text tokenizer and word-frequency
histogram) is deliberately larger than the test suite: the suite is a
narrow, honest smoke test of `tokenize` on one punctuation-free sentence and
`build_histogram` on a short literal list. It never calls anything in
`stats.py` (0% -- `average_token_length`, `longest_token`,
`vocabulary_richness`, `shortest_token` are all dead in the tests), never
exercises punctuation-stripping, stopword filtering, `top_n`,
`histogram_by_bucket` or `merge_histograms`. Both tests pass -- this is a
real, legitimate suite that is simply far from exhaustive.

SlipCover is an independent measurement engine from Coverage.py in this
roster, so this folder deliberately holds different code from the
Coverage.py folder -- agreement between two tools pointing at the same file
would prove nothing.

## Command

```bash
slipcover --source src -m pytest -q
```

Real measured output (identical across py3.11 / py3.13 / py3.14):

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

42% is well under the 50% threshold this corpus targets.

## Layout

```text
lexihist/
  pyproject.toml      project root marker; zero dependencies
  src/lexihist/
    __init__.py
    tokenize.py        splitting text into normalised tokens
    histogram.py        counting and bucketing token frequency
    stats.py             length/vocabulary summary statistics (entirely untested)
  tests/
    test_basic.py        one plain sentence, one literal histogram
```

## Notes

The source uses no builtin generic subscripting, no `dataclasses`, and no
`from __future__ import annotations` -- nothing in it has a floor above
Python 3.6, so the same source and the same measured gap apply unchanged
across every version folder, including the code-only 3.6/3.7 ones.
