# CrossHair

**py3.7 boundary variant -- code-only.** No Python 3.7 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8). This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,7))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter (all 8 tests pass). It was not run against the real tool.

Synthetic, invalid-by-design Python project for **CrossHair**.

Domain: closed integer weight/distance ranges for parcel routing.

## What this package is designed to make CrossHair get wrong

Clean's version of this folder has every contract hold everywhere. This
one has three of its four functions with a real boundary bug relative to
their own `post:` contract. On 3.13/3.14, the identical source was
measured for real: **3 of 4 contract-annotated functions have a
counterexample (75%)**. See `py3.13/README.md` for the full breakdown and
output; `src/` here is byte-for-byte identical.

## Command

```bash
crosshair check src/parcelmath --per_condition_timeout=15
```

(Not run on this version -- see above.)

## Layout

```text
parcelmath/
  pyproject.toml      project root marker; zero dependencies
  src/parcelmath/
    __init__.py
    span.py
  tests/
    test_span.py
```

## Notes

Nothing needed to change for this version either: no `dataclasses`, no
builtin generic subscripting, no `from __future__ import annotations`
anywhere in this package.
