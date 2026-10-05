# Lizard

**py3.11 boundary variant -- the corpus's original middle version.** Measured clean or documented not-installed exactly as recorded in this corpus's very first build; unchanged by the later boundary-version work.


Synthetic, clean-by-design Python project for **Lizard**.

Domain: shipping zone lookup by distance band.

## What a passing result looks like

Lizard reports zero warnings: every function is under CCN 5, well under 60 lines, and takes at most three parameters -- comfortably inside the default CCN 15 / length 1000 / parameter 100 thresholds and inside the much tighter ones used here.

## Command

```bash
lizard src/ -C 5 -L 40 -a 3 -w
```

Expected: `(no warnings; exit 0)`

## Layout

```text
freightzone/
  pyproject.toml      project root marker; zero dependencies
  src/freightzone/
    __init__.py
    bands.py
    rates.py
  tests/
    test_freightzone.py
```

## Notes

Thresholds are set far below Lizard's defaults on purpose: a folder that only passes the default CCN 15 proves very little. `-w` prints warnings only, so any output at all is a failure.
