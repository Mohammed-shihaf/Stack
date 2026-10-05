# jscpd

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8). This source needed **no mechanical downgrade**: it never uses builtin generic subscripting, `dataclasses`, or `from __future__ import annotations`, so it is reused byte-for-byte from the baseline. Verified instead by `ast.parse(source, feature_version=(3,6))` on every file (passes) and by this folder's own pytest suite running unmodified and green under an available interpreter (5 passed). It was not run against the real tool listed below; jscpd itself is a Node tool and is version-agnostic to the Python source regardless, but this corpus's own consistency guarantee -- that 3.6/3.7 ship real, grammar-valid source -- still applies.


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
