# sys.settrace driver (stdlib)

**py3.14 boundary variant -- measured.** A real Python 3.14 interpreter
actually ran this folder's `driver.py` in the build environment; the
result below is real, not asserted.

Synthetic, deliberately-wrong Python project for **sys.settrace driver
(stdlib)**.

Domain: a small event router, retry policy and state-transition table,
traced by a stdlib coverage driver.

## What a wrong result looks like

The tracer itself is unmodified -- real `sys.settrace`, real
`co_lines()` comparison. `exercise()` only drives one event route and one
state transition, leaving most of `policy.py`, `router.py` and
`transitions.py` untraced.

## Command

```bash
python driver.py
```

Real measured output:

```text
policy.py: missing lines [1, 3, 4, 7, 9, 10, 11, 12, 15, 17, 18, 19, 22, 24, 25, 26, 27, 28]
router.py: missing lines [10, 11, 12, 17, 22, 23, 24, 25, 26, 27, 28, 29, 30]
transitions.py: missing lines [19, 24, 25, 26]
evrouter: 38% (22/57 statements)
```

**38% < 50%.** The folder's separate pytest suite (`tests/test_evrouter.py`,
12 tests) passes in full -- that is a real, legitimate test suite; it is
simply not what the trace in `driver.py` exercises.

## Layout

```text
evrouter/
  pyproject.toml
  src/evrouter/
    __init__.py
    router.py
    policy.py
    transitions.py
  tests/
    test_evrouter.py
  driver.py
```
