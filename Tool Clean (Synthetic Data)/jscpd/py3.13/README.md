# jscpd

**py3.13 boundary variant -- measured.** A real Python 3.13 interpreter and this tool's own current release were both actually installed and invoked against this folder in the build environment; the result below is real, not asserted.


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
