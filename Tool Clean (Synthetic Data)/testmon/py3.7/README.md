# testmon

**py3.7 boundary variant -- code-only.** No Python 3.7 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8). This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,7))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after downgrading builtin generic subscripting (`list[int]` etc., which needs 3.9+) to `typing.List`/`typing.Dict`/etc. It was not run against the real tool listed below.


Synthetic, clean-by-design Python project for **testmon**.

Domain: currency rounding and split.

## What a passing result looks like

`pytest --testmon` collects, builds its dependency database and runs every test green; a second run with nothing changed selects no tests and still exits 0.

## Command

```bash
pytest --testmon -q && pytest --testmon -q
```

Expected: `all tests pass, then 'no tests ran' on the unchanged re-run`

## Layout

```text
coinshift/
  pyproject.toml      project root marker; zero dependencies
  src/coinshift/
    __init__.py
    rounding.py
    split.py
  tests/
    test_rounding.py
    test_split.py
  .gitignore
```

## Notes

The second run is the actual assertion. A first green run only proves the suite passes; testmon's job is to notice that nothing changed, and an empty selection exiting 0 is the clean result. `.testmondata` is generated state, not corpus content, and is git-ignored.
