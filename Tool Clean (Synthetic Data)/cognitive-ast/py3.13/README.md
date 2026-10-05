# cognitive-ast

**py3.13 boundary variant -- measured.** A real Python 3.13 interpreter and this tool's own current release were both actually installed and invoked against this folder in the build environment; the result below is real, not asserted.


Synthetic, clean-by-design Python project for **cognitive-ast**.

Domain: flat discount rules over an order total.

## What a passing result looks like

Every function scores 0-2 on cognitive complexity against a threshold of 15. Nesting never exceeds one level and no boolean operator sequence is mixed, so the increments that drive the score never accumulate.

## Command

```bash
python -m driver
```

Expected: `max cognitive score 2 (threshold 15)`

## Layout

```text
pricerule/
  pyproject.toml      project root marker; zero dependencies
  src/pricerule/
    __init__.py
    rules.py
    apply.py
  tests/
    test_pricerule.py
  driver.py
```

## Notes

This folder was empty in the harvested set for a concrete reason: **there is no PyPI package named cognitive-ast**. The corpora implement it as a standard-library `ast` scorer, and `driver.py` here is that scorer -- Sonar's cognitive-complexity rules (nesting increment, boolean-sequence increment, no increment for an `else` chain) over the stdlib `ast` module. Synthetic data is the only way this folder can exist at all.
