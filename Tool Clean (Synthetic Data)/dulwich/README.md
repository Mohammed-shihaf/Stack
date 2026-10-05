# dulwich

Synthetic, clean-by-design Python project for **dulwich**.

Domain: release note collection.

## What a passing result looks like

dulwich opens the repository, walks the full history and resolves every commit, tree and blob without error, and the commit and author counts it reports agree with `git log`.

## Command

```bash
python -m driver
```

Expected: `history readable: N commits, 3 authors`

## Layout

```text
notekeeper/
  pyproject.toml      project root marker; zero dependencies
  src/notekeeper/
    __init__.py
    notes.py
    format.py
  tests/
    test_notekeeper.py
  driver.py
```

## Notes

A history tool's clean result is a well-formed repository, not an absence of findings. The generated history has three distinct authors so an ownership calculation has something to divide, and every commit touches exactly one file so churn is attributable. The corpora found that a history parser splitting each record on the first newline collapses 40 commits to 1 and reports a single author at 100% -- this repository is shaped to make that failure visible.

## Not split by Python version

This tool reads git history and diff/coverage metadata, never Python source syntax, so a Python-version boundary axis has nothing to measure here: its result cannot depend on which interpreter wrote the code underneath. It stays single-version rather than being copied five times for an identical result each time.
