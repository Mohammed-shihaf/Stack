# complexipy

**py3.7 boundary variant -- code-only.** No Python 3.7 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8). This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,7))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after downgrading builtin generic subscripting (`list[int]` etc., which needs 3.9+) to `typing.List`/`typing.Dict`/etc. It was not run against the real tool listed below.


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
