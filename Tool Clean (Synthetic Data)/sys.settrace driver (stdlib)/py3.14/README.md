# sys.settrace driver (stdlib)

**py3.14 boundary variant -- measured (interpreter pinned to 3.14.0rc2, matching this project's convention elsewhere).** A real Python 3.14 interpreter and this tool's own current release were both actually installed and invoked against this folder in the build environment; the result below is real, not asserted.


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
