# git-hot

Synthetic, clean-by-design TypeScript project for **git-hot**.

Package: git-hot 0.11.1 (PyPI, github.com/dspinellis/git-hot)

Domain: lighthouse lamp maintenance log (LampLog)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

`bash make-history.sh clean` builds 3 commits in which every line is added once and never rewritten; git-hot reports `max(churn) = 0` for both files.

## Command

```bash
bash make-history.sh clean
cd history-repo && git-hot --format '{max(churn):5d} {days(median(line_age)):5d} {path}' HEAD
```

## Notes

git-hot reports, per file, how often its live lines were rewritten (`churn`) and how old they are (`line_age`). It needs real history, so the folder carries `make-history.sh`, which builds a deterministic repository in `history-repo/` (fixed author, fixed dates; it is git-ignored) instead of a binary git bundle. git-hot is a Python tool: Node-version-independent, one folder. Measured 2026-10-07 with git-hot 0.11.1.
