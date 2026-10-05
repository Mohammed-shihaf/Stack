# Beniget

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8). This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,6))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter (all 4 tests pass -- each documents a real bug with `pytest.raises`, exactly as on 3.13/3.14). It was not run against the real tool.

Synthetic, invalid-by-design Python project for **Beniget**.

Domain: elevator dispatch bookkeeping for a single shaft.

## What this package is designed to make beniget get wrong

Clean's version of this folder has beniget resolve every identifier. This
one instead reads five names, across four functions, that genuinely have no
live binding under beniget's own def-use analysis: a `del`-ed name read
afterward, an `except ... as name:` name read after its clause (Python
itself deletes it there), a comprehension loop variable read outside the
comprehension, and a chain of both. On 3.13/3.14, the identical source was
measured for real: **5 of 9 examined identifier uses were unbound (55%)**.
See `py3.13/README.md` for the exact command and output; `src/` here is
byte-for-byte identical (no type annotations, no builtin generics,
nothing with a floor above 3.6), so that result applies here too.

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

Only `driver.py` needed a mechanical change for this version:
`from __future__ import annotations` (3.7+) was replaced with an explicit
`typing.List` annotation. Nothing under `src/` or `tests/` changed --
the package uses no type annotations, no `dataclasses`, and no builtin
generic subscripting to begin with.
