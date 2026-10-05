# jscpd

Boundary-version matrix for **jscpd** -- the deliberate inverse of the Clean
corpus's `jscpd` folder. Where Clean's `unitcast` project writes three unit
converters in three genuinely different shapes so jscpd finds nothing, this
project (`shipcalc`) writes four shipment-surcharge calculators that are the
same shape, copy-pasted, with only the function name and docstring changed
per file -- exactly the "natural way to write four near-identical
calculators" that Clean's own README warns against.

| Version | Status |
|---|---|
| py3.6 | CODE-ONLY (not run against a live interpreter) |
| py3.7 | CODE-ONLY (not run against a live interpreter) |
| py3.11 | MEASURED WRONG (real jscpd run) |
| py3.13 | MEASURED WRONG (real jscpd run) |
| py3.14 | MEASURED WRONG (real jscpd run) |

jscpd runs on Node, not on the Python interpreter, so its result cannot
depend on which Python version wrote the source underneath -- the measured
result is identical, by real re-run, on 3.11, 3.13 and 3.14. The same source
also needed no mechanical downgrade for 3.6/3.7: it never uses builtin
generic subscripting, `dataclasses`, or `from __future__ import annotations`,
so the floor those features impose on Clean's own corpus never applies here.
See each `py3.X/README.md` for the exact command and result.

## Measured result (3.11 / 3.13 / 3.14, identical real jscpd 5.3.3 runs)

```
jscpd src/ --min-lines 5 --min-tokens 30 --threshold 0 --reporters console
```

```
Files analyzed: 4   Total lines: 52   Total tokens: 248
Clones found: 3     Duplicated lines: 33 (63.46%)   Duplicated tokens: 141 (56.85%)
Found 3 clones.
ERROR: jscpd found too many duplicates (63.5%) over threshold (0.0%)
```

**63.46% of scanned lines are reported duplicated -- a genuine majority-wrong
result from the real tool**, well past the 50% target. `__init__.py` is not
counted by jscpd (its import-only body falls under the tool's own analysis
floor), so the four surcharge modules (13 lines each, 52 total) are the
entire denominator; three of the four are flagged as clones of the fourth
(`bulk.py`), each clone spanning the full 11-line computation body.

## Why this triggers and Clean's own `unitcast` does not

jscpd's Python tokenizer does **not** normalize identifier text -- two
otherwise-identical lines that differ in even one variable name or numeric
literal are not matched (confirmed empirically while building this fixture:
renaming a shared module-level constant, or changing a single numeric
literal, dropped the match to 0 clones). What it tolerates is a block that is
**byte-identical** apart from the enclosing `def` line and docstring, which
is exactly what four independently-maintained but copy-pasted surcharge
calculators look like: same parameters, same arithmetic, same literals,
different function name.
