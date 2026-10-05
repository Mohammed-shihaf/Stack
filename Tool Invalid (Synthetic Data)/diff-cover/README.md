# diff-cover

Synthetic, invalid-by-design Python project for **diff-cover** (the
deliberate inverse of the Python-Tools-Clean counterpart).

Domain: line-oriented report rendering.

## What a failing result looks like

This is a real git repository with a `main` base and a `feature` branch,
and the command chain below is the real, unmodified `diff-cover` tool run
against a real `coverage.xml` produced by a real `pytest` run -- nothing
here is asserted or mocked. The `feature` commit adds a genuinely new,
multi-branch executable function (`classify_width`) together with a test
suite, but the test suite deliberately exercises only one of its four
return branches, so most of the new executable lines the diff introduces
are never hit.

## Command

```bash
coverage run --branch -m pytest -q && coverage xml && diff-cover coverage.xml --compare-branch=main --fail-under=100
```

Expected (majority wrong): diff-cover's own reported **Diff Coverage is
well under 50%**, and `--fail-under=100` makes the command exit non-zero.

## Layout

```text
reportlines/
  pyproject.toml      project root marker; zero dependencies
  src/reportlines/
    __init__.py
    width.py
    render.py
  tests/
    test_reportlines.py
```

## Not split by Python version

This tool reads git history and diff/coverage metadata, never Python
source syntax, so a Python-version boundary axis has nothing to measure
here: its result cannot depend on which interpreter wrote the code
underneath. It stays single-version rather than being copied five times
for an identical result each time.
