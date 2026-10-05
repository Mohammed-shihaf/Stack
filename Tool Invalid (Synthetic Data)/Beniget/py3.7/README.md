# Beniget

**py3.7 boundary variant -- code-only.** No Python 3.7 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8). This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,7))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter (all 4 tests pass). It was not run against the real tool.

Synthetic, invalid-by-design Python project for **Beniget**.

Domain: elevator dispatch bookkeeping for a single shaft.

## What this package is designed to make beniget get wrong

Clean's version of this folder has beniget resolve every identifier. This
one instead reads five names, across four functions, that genuinely have no
live binding under beniget's own def-use analysis (see `py3.13/README.md`
for the full breakdown and the measured result: **5 of 9 examined
identifier uses were unbound, 55%**). `src/` here is byte-for-byte
identical to the measured 3.13/3.14 source.

## Command

```bash
python -m driver
```

(Not run on this version -- see above.)

## Layout

```text
liftqueue/
  pyproject.toml      project root marker; zero dependencies
  src/liftqueue/
    __init__.py
    dispatch.py
  tests/
    test_dispatch.py
  driver.py
```

## Notes

`driver.py`'s one builtin generic return annotation (`list[str]`, needs
3.9+) was rewritten to `typing.List[str]`; `from __future__ import
annotations` stays, since 3.7 clears that floor. Nothing under `src/` or
`tests/` changed.
