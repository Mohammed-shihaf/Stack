# jscpd

**py3.7 boundary variant -- code-only.** No Python 3.7 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8). This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,7))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after downgrading builtin generic subscripting (`list[int]` etc., which needs 3.9+) to `typing.List`/`typing.Dict`/etc. It was not run against the real tool listed below.


Synthetic, clean-by-design Python project for **jscpd**.

Domain: three unrelated unit converters.

## What a passing result looks like

Zero clones. jscpd finds no duplicated block at its default threshold, and none at the much tighter settings used here (5 lines / 30 tokens), because the three converter modules share no structure: one is a lookup table, one is a ratio chain, one is a parser.

## Command

```bash
jscpd src/ --min-lines 5 --min-tokens 30 --threshold 0 --reporters console
```

Expected: `Found 0 clones`

## Layout

```text
unitcast/
  pyproject.toml      project root marker; zero dependencies
  src/unitcast/
    __init__.py
    lookup.py
    ratio.py
    parser.py
  tests/
    test_lookup.py
    test_ratio.py
    test_parser.py
```

## Notes

The natural way to write three converters is one shape repeated three times, which is exactly a clone group. Each module here is deliberately a different shape. Note `--threshold 0`: jscpd's threshold is a **failure budget**, not a detection floor, so 0 means any clone at all fails the run.
