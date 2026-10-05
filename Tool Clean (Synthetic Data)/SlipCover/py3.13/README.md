# SlipCover

**py3.13 boundary variant -- measured.** A real Python 3.13 interpreter and this tool's own current release were both actually installed and invoked against this folder in the build environment; the result below is real, not asserted.


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
