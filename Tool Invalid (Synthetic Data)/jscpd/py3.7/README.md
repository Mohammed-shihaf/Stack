# jscpd

**py3.7 boundary variant -- code-only.** Same reasoning as py3.6 (see its README), targeting `feature_version=(3,7)`. No source change was needed here either: the baseline never uses builtin generic subscripting, `dataclasses`, or `from __future__ import annotations`, so 3.7 reuses it byte-for-byte too. Verified by `ast.parse(source, feature_version=(3,7))` on every file (passes) and by this folder's own pytest suite running unmodified and green under an available interpreter (5 passed). Not run against the real tool.


Synthetic, invalid-by-design Python project for **jscpd** -- the inverse of
Clean's `unitcast`.

Domain: four shipment-surcharge calculators (`express`, `freight`, `bulk`,
`fragile`) that compute the identical formula, copy-pasted with only the
function name and docstring changed per file.

## What a wrong result looks like

jscpd, run for real against `src/` on the measured versions (py3.11/13/14 --
see their READMEs), reports a majority of scanned lines as duplicated:
**63.46%** duplicated lines, 3 clones, from real jscpd 5.3.3. Not run here.

## Command

```bash
jscpd src/ --min-lines 5 --min-tokens 30 --threshold 0 --reporters console
```

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
`compute_<class>_surcharge` function whose 11-line body is byte-identical
across all four files -- only the function name and one-line docstring
differ. `tests/test_shipcalc.py` exercises all four and asserts that three
of them agree with `express`'s output bit-for-bit.
