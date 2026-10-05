# pydriller

Synthetic, clean-by-design Python project for **pydriller**.

Domain: a ledger of task state transitions.

## What a passing result looks like

PyDriller traverses every commit and reports the same commit count and the same set of authors as `git log`, with per-file modification counts attributable to individual commits.

## Command

```bash
python -m driver
```

Expected: `N commits, 3 contributors`

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

## Notes

PyDriller and dulwich are each other's cross-check in the roster, so this folder and the dulwich folder hold different code and different histories -- two tools agreeing about one repository proves less than two tools agreeing about two. The history gives each commit exactly one file so churn attribution is unambiguous. If PyDriller fails to open the repository on a Windows host reached through a Linux bridge, the cause is the worktree `.git` file carrying a Windows `gitdir:` path, not the corpus.

## Not split by Python version

This tool reads git history and diff/coverage metadata, never Python source syntax, so a Python-version boundary axis has nothing to measure here: its result cannot depend on which interpreter wrote the code underneath. It stays single-version rather than being copied five times for an identical result each time.
