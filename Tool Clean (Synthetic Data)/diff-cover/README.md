# diff-cover

Synthetic, clean-by-design Python project for **diff-cover**.

Domain: line-oriented report rendering.

## What a passing result looks like

Diff coverage is 100%: every executable line changed on the branch is covered by the suite, so `diff-cover` reports no missing lines and `--fail-under=100` exits 0.

## Command

```bash
coverage run --branch -m pytest -q && coverage xml && diff-cover coverage.xml --compare-branch=main --fail-under=100
```

Expected: `Diff coverage: 100%`

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

## Notes

The folder is a real git repository with a `main` base and a `feature` branch, because diff-cover needs a diff to report on. The feature commit adds an executable function **and its test in the same commit** -- adding covered-looking code without its test is how a diff-coverage gate is accidentally satisfied by a diff containing nothing executable at all.

## Not split by Python version

This tool reads git history and diff/coverage metadata, never Python source syntax, so a Python-version boundary axis has nothing to measure here: its result cannot depend on which interpreter wrote the code underneath. It stays single-version rather than being copied five times for an identical result each time.
