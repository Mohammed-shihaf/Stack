# dulwich

Synthetic, invalid-by-design Python project for **dulwich** (the deliberate
inverse of the Python-Tools-Clean counterpart).

Domain: release note collection.

## What a failing result looks like

The driver below is a real `dulwich` program: it opens this repository with
`Repo(".")`, walks the real commit history with `repo.get_walker()`, and for
each commit checks the real commit message body for a well-formed
`Co-authored-by: Name <email>` trailer whose email matches the project's
real contributor roster. That is a meaningful, falsifiable property --
counting the author field alone (as a naive "readable" check does) proves
nothing about whether a commit's stated co-authorship is real. The
repository's actual history is built so that most commits fail this check:
the trailer is missing, malformed, or names someone outside the roster.

## Command

```bash
python -m driver
```

Expected (majority wrong): `N well_formed out of M commits (<50%)`, i.e. a
**non-passing** result -- `driver.py` exits 1 when fewer than half of
commits have a well-formed, roster-matched trailer.

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

## Not split by Python version

This tool reads git history and diff/coverage metadata, never Python source
syntax, so a Python-version boundary axis has nothing to measure here: its
result cannot depend on which interpreter wrote the code underneath. It
stays single-version rather than being copied five times for an identical
result each time.
