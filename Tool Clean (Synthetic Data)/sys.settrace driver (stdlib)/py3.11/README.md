# sys.settrace driver (stdlib)

**py3.11 boundary variant -- the corpus's original middle version.** Measured clean or documented not-installed exactly as recorded in this corpus's very first build; unchanged by the later boundary-version work.


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
