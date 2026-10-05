# jscpd

**py3.13 boundary variant.** Measured for real in this build environment: the actual interpreter and jscpd 5.3.3 were both invoked against this folder.

Synthetic, invalid-by-design Python project for **jscpd** -- the inverse of
Clean's `unitcast`.

Domain: four shipment-surcharge calculators (`express`, `freight`, `bulk`,
`fragile`) that compute the identical formula, copy-pasted with only the
function name and docstring changed per file.

## What a wrong result looks like

jscpd, run for real against `src/`, reports a majority of scanned lines as
duplicated.

## Command

```bash
jscpd src/ --min-lines 5 --min-tokens 30 --threshold 0 --reporters console
```

## Real result (this version)

```
Files analyzed: 4   Total lines: 52   Total tokens: 248
Clones found: 3     Duplicated lines: 33 (63.46%)   Duplicated tokens: 141 (56.85%)
Found 3 clones.
ERROR: jscpd found too many duplicates (63.5%) over threshold (0.0%)
```

`jscpd` exits 1. **63.46% of scanned lines (33 of 52) are reported
duplicated** -- comfortably past the 50% majority-wrong target, from a real
run of real jscpd 5.3.3.

## Layout

```text
shipcalc/
  pyproject.toml      project root marker; zero dependencies
  src/shipcalc/
    __init__.py
    express.py
    freight.py
    bulk.py
    fragile.py
  tests/
    test_shipcalc.py
```

## Notes

`express.py`, `freight.py`, `bulk.py` and `fragile.py` each define a
`compute_<class>_surcharge` function whose 11-line body (weight rate,
declared-value threshold, remote-area flat fee, handling markup) is
byte-identical across all four files -- only the function name and the
one-line docstring differ, which jscpd's tokenizer does not match on.
`bulk.py` is reported as the common ancestor; `express.py`, `freight.py`
and `fragile.py` are each flagged as a clone of it. `tests/test_shipcalc.py`
exercises all four and additionally asserts that three of them agree with
`express`'s output bit-for-bit, which is the whole problem in one assertion.
