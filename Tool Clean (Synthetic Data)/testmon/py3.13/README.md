# testmon

**py3.13 boundary variant -- measured.** A real Python 3.13 interpreter and this tool's own current release were both actually installed and invoked against this folder in the build environment; the result below is real, not asserted.


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
