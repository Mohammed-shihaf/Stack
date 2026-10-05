# SlipCover

**py3.7 boundary variant -- code-only.** No Python 3.7 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8). This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,7))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after downgrading builtin generic subscripting (`list[int]` etc., which needs 3.9+) to `typing.List`/`typing.Dict`/etc. It was not run against the real tool listed below.


Synthetic, clean-by-design Python project for **SlipCover**.

Domain: small fixed-length vector arithmetic.

## What a passing result looks like

SlipCover reports 100% of lines covered across the package, with no line listed as missing.

## Command

```bash
slipcover --source src -m pytest -q
```

Expected: `all files 100%`

## Layout

```text
vectorlite/
  pyproject.toml      project root marker; zero dependencies
  src/vectorlite/
    __init__.py
    ops.py
    norm.py
  tests/
    test_vectorlite.py
```

## Notes

SlipCover and Coverage.py are cross-checks of one another in the roster, so this folder and the Coverage.py folder deliberately hold different code. Agreement between two tools on the same file is worth nothing if the file is the only thing either of them ever saw.
