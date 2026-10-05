# symilar

**py3.11 boundary variant.** Measured for real in this build: symilar (pylint 4.1.1's bundled checker) was invoked against this folder's own source.

Synthetic, invalid-by-design Python project for **symilar** -- the inverse
of Clean's `checkfour`.

Domain: four greenhouse zone-climate guards (`humidity`, `co2`, `light`,
`soil`), each a guard-clause-then-return function with the identical body,
copy-pasted.

## What a wrong result looks like

symilar, run for real against the four guard modules, reports more than half
of the scanned source as part of a duplicate group.

## Command

```bash
symilar --duplicates=4 --ignore-comments --ignore-docstrings src/climateguard/*.py
```

## Real result (this version)

```
11 similar lines in 2 files: co2_guard.py / humidity_guard.py
11 similar lines in 2 files: light_guard.py / soil_guard.py
TOTAL lines=70 duplicates=22 percent=31.43
```

symilar's own `percent` counts each matched block once per group (22), not
once per file. Counted per scanned file instead -- the ratio this corpus's
target is defined on -- all four guard modules have their 11-line body
flagged:

```
flagged lines = 11 lines x 4 files = 44
total lines   = 70 (symilar's own TOTAL)
ratio         = 44 / 70 = 62.86%
```

**62.86% of the scanned source is part of a real, symilar-reported duplicate
group** -- from a real run of real symilar (pylint's bundled checker).

## Layout

```text
climateguard/
  pyproject.toml      project root marker; zero dependencies
  src/climateguard/
    __init__.py
    humidity_guard.py
    co2_guard.py
    light_guard.py
    soil_guard.py
  tests/
    test_climateguard.py
```

## Notes

Each guard module's `check_<measurement>_guard` function is an identical
four-branch guard clause (missing reading, too low, too high, nominal) over
the same literal thresholds and the same alert strings -- only the module
docstring (stripped by `--ignore-docstrings`) and the function/file name
differ. `tests/test_climateguard.py` exercises all four guards' band logic
independently.
