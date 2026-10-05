# complexipy

**py3.11 boundary variant -- the corpus's original middle version.** Measured clean or documented not-installed exactly as recorded in this corpus's very first build; unchanged by the later boundary-version work.


Synthetic, clean-by-design Python project for **complexipy**.

Domain: neighbour lookup on a bounded grid.

## What a passing result looks like

Every function scores at or below the configured maximum cognitive complexity, so `complexipy` exits 0 with no function listed over budget.

## Command

```bash
complexipy src/ --max-complexity-allowed 8
```

Expected: `all functions within budget; exit 0`

## Layout

```text
gridwalk/
  pyproject.toml      project root marker; zero dependencies
  src/gridwalk/
    __init__.py
    offsets.py
    grid.py
  tests/
    test_gridwalk.py
```

## Notes

Neighbour lookup is normally written as a doubly nested loop with a bounds check and a self-exclusion check inside it -- three nesting increments on the innermost condition. Precomputing the offsets and filtering once flattens it to a single comprehension. Note the flag spelling: complexipy 8.x renamed `-mx` to `--max-complexity-allowed`.
