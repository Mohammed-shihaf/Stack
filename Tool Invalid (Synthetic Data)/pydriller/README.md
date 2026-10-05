# pydriller

Synthetic, invalid-by-design Python project for **pydriller** (the
deliberate inverse of the Python-Tools-Clean counterpart).

Domain: a ledger of task state transitions.

## What a failing result looks like

The driver below is a real `pydriller` program: it traverses this
repository's real commit history with `Repository(".").traverse_commits()`
and, for each commit, reads the real `[area:X]` tag in the commit message
and checks the real `modified_files` PyDriller reports for that commit
against it. That is a concrete, falsifiable co-change property -- counting
commits/authors/modification totals (as a naive traversal does) says
nothing about whether a commit's stated area matches what it actually
touched. The repository's real history is built so that most commits'
tags do **not** match their real modified files.

## Command

```bash
python -m driver
```

Expected (majority wrong): a **non-passing** result -- `driver.py` exits 1
when fewer than half of tagged commits touch a file under their own area.

## Layout

```text
taskledger/
  pyproject.toml      project root marker; zero dependencies
  src/taskledger/
    __init__.py
    states.py
    ledger.py
  tests/
    test_taskledger.py
  driver.py
```

## Not split by Python version

This tool reads git history and diff/coverage metadata, never Python
source syntax, so a Python-version boundary axis has nothing to measure
here: its result cannot depend on which interpreter wrote the code
underneath. It stays single-version rather than being copied five times
for an identical result each time.
