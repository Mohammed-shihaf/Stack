# sys.settrace driver (stdlib)

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8), and most of this tool's current releases no longer install on an interpreter that old anyway. This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,6))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after the mechanical 3.6 downgrade (builtin generics -> typing.X, no stdlib `dataclasses`, no `from __future__ import annotations`). It was not run against the real tool listed below.


Synthetic, clean-by-design Python project for **sys.settrace driver (stdlib)**.

Domain: a queue scheduler traced by a stdlib coverage driver.

## What a passing result looks like

The driver traces every executable statement in the package: the statements-hit count equals the statements-found count, so coverage is 100% with nothing missing.

## Command

```bash
python -m driver
```

Expected: `tracedemo: 100% (N/N statements)`

## Layout

```text
tracedemo/
  pyproject.toml      project root marker; zero dependencies
  src/tracedemo/
    __init__.py
    policy.py
    queue.py
  tests/
    test_tracedemo.py
  driver.py
```

## Notes

This folder was empty in the harvested set because there is nothing to harvest: the tool is `sys.settrace` itself, and the driver is written by whoever needs it. `driver.py` here is that driver -- a line-event tracer that records executed line numbers and compares them against the statement lines found by `ast`. It is the only coverage-shaped number available on an interpreter too old for Coverage.py, which is why the roster carries it.
