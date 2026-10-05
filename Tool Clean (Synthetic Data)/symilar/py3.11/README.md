# symilar

**py3.11 boundary variant -- the corpus's original middle version.** Measured clean or documented not-installed exactly as recorded in this corpus's very first build; unchanged by the later boundary-version work.


Synthetic, clean-by-design Python project for **symilar**.

Domain: four field validators, each structurally distinct.

## What a passing result looks like

symilar reports no similar lines. At a threshold of 4 lines -- tighter than the default -- no two modules share a comparable block, because each validator uses a different construct: a regex, a checksum loop, a set membership test and a range comparison.

## Command

```bash
symilar --duplicates=4 --ignore-comments --ignore-docstrings src/checkfour/*.py
```

Expected: `TOTAL lines=... duplicates=0 percent=0.00`

## Layout

```text
checkfour/
  pyproject.toml      project root marker; zero dependencies
  src/checkfour/
    __init__.py
    postcode.py
    checksum.py
    membership.py
    bounds.py
  tests/
    test_checkfour.py
```

## Notes

Four validators are the classic place a clone group forms: the same guard-clause-then-return shape, copied. The temptation is worth resisting on purpose here. Because symilar is what pylint ships as its duplicate detector, this folder and the jscpd folder are separate -- the same two tools pointed at one directory is a single measurement, not a cross-check.
