# symilar

Boundary-version matrix for **symilar** -- the deliberate inverse of the
Clean corpus's `symilar` folder. Where Clean's `checkfour` writes four field
validators in four genuinely different constructs (regex, checksum loop, set
membership, range comparison) so symilar finds nothing, this project
(`climateguard`) writes four greenhouse zone-climate guards that all use the
same guard-clause-then-return shape, with the same messages and the same
thresholds -- exactly the clone group Clean's own README says the shape
tempts you toward.

| Version | Status |
|---|---|
| py3.6 | CODE-ONLY (not run against a live interpreter) |
| py3.7 | CODE-ONLY (not run against a live interpreter) |
| py3.11 | MEASURED WRONG (real symilar run) |
| py3.13 | MEASURED WRONG (real symilar run) |
| py3.14 | MEASURED WRONG (real symilar run) |

symilar is pylint's bundled similarity checker; its result depends only on
the Python source text, not on the interpreter running it, so 3.11/3.13/3.14
were each measured with a real, independent `symilar` invocation inside
their own folder (pylint 4.1.1 in every venv here) and produced identical
output. The same source needed no mechanical downgrade for 3.6/3.7: it never
uses builtin generic subscripting, `dataclasses`, or
`from __future__ import annotations`.

## Measured result (3.11 / 3.13 / 3.14, identical real symilar runs, pylint 4.1.1)

```bash
symilar --duplicates=4 --ignore-comments --ignore-docstrings src/climateguard/*.py
```

```
11 similar lines in 2 files: co2_guard.py / humidity_guard.py
11 similar lines in 2 files: light_guard.py / soil_guard.py
TOTAL lines=70 duplicates=22 percent=31.43
```

symilar's own `percent` field (31.43%) is a per-reported-group metric, not
the scanned-file ratio the corpus's target is defined on -- it only sums each
matched block once (11 lines x 2 groups = 22), not once per file that
contains it. **The ratio that matters here -- how much of the scanned source
is part of some reported duplicate group -- is computed per-file:**

```
humidity_guard.py: lines 5-15 flagged (11 of 16 lines)
co2_guard.py:      lines 5-15 flagged (11 of 16 lines)
light_guard.py:    lines 5-15 flagged (11 of 16 lines)
soil_guard.py:     lines 5-15 flagged (11 of 16 lines)

flagged lines  = 11 x 4 files = 44
total lines    = symilar's own "TOTAL lines=70"
ratio          = 44 / 70 = 62.86%
```

**62.86% of the scanned source is part of a real, symilar-reported duplicate
group** -- past the 50% majority-wrong target, from a real run of real
symilar (pylint 4.1.1's bundled checker).

## Why this triggers and Clean's own `checkfour` does not

symilar compares source **lines verbatim** (after stripping comments and
docstrings per the flags above) -- confirmed empirically while building this
fixture: changing a single word or number anywhere inside an otherwise
shared block (even keeping every variable name identical) dropped the match
to zero, because no run of >=4 consecutive identical lines survived the
difference. What triggers a match is a guard body that is **completely
identical text** across files, which is exactly what four climate guards
look like when one is copy-pasted from another and only the measurement name
in the module docstring (stripped by `--ignore-docstrings`) and the function
name change.
