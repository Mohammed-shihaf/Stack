# sys.settrace driver (stdlib)

Boundary-version matrix for **sys.settrace driver (stdlib)**, inverse
corpus: each `py3.X/` folder is a complete, independent project engineered
to make the real stdlib tracer report a genuinely, measurably wrong
(majority-unexercised) statement ratio -- not an assertion, not a mocked
number.

| Version | Status |
|---|---|
| py3.6 | CODE-ONLY (not run against a live interpreter) |
| py3.7 | CODE-ONLY (not run against a live interpreter) |
| py3.11 | MEASURED WRONG -- `evrouter: 38% (22/57 statements)` |
| py3.13 | MEASURED WRONG -- `evrouter: 38% (22/57 statements)` |
| py3.14 | MEASURED WRONG -- `evrouter: 38% (22/57 statements)` |

## What "wrong" means here

The tracer's own logic (`driver.py`) is **unchanged** from a clean-by-design
driver: it still registers a real `sys.settrace` line hook, still compares
against `co_lines()`, still reports the hit/found ratio honestly. Only the
fixture's shape changed: `exercise()` now drives a narrow slice of the
package (one known event route, one known state transition) instead of
every function, so most of `policy.py`, `router.py` and `transitions.py`
never executes a single line while the driver is tracing.

## Command

```bash
python driver.py
```

(the folder also has a `[tool.pytest.ini_options]` entry so `python -m
pytest -q` runs the real, separate test suite -- that suite passes in full;
it is not what `driver.py` traces, and its passing is not evidence of
coverage.)

Real measured output (identical across py3.11 / py3.13 / py3.14):

```text
policy.py: missing lines [1, 3, 4, 7, 9, 10, 11, 12, 15, 17, 18, 19, 22, 24, 25, 26, 27, 28]
router.py: missing lines [10, 11, 12, 17, 22, 23, 24, 25, 26, 27, 28, 29, 30]
transitions.py: missing lines [19, 24, 25, 26]
evrouter: 38% (22/57 statements)
```

**38% < 50%.**

## Layout

```text
evrouter/
  pyproject.toml      project root marker; zero dependencies
  src/evrouter/
    __init__.py
    router.py          event -> handler routing (most branches untraced)
    policy.py           retry/backoff policy (entirely untraced)
    transitions.py       a small state-transition table
  tests/
    test_evrouter.py     a real, full pytest suite -- separate from the trace
  driver.py              the stdlib sys.settrace tracer, unchanged logic
```

## Notes

`driver.py` is byte-identical in its tracer logic across py3.11/13/14. The
py3.6/py3.7 copies rewrite only the two builtin-generic annotations
(`dict`/`set` -> `typing.Dict`/`Set`) the same way Clean's corpus did,
leaving `exercise()` and the comparison logic untouched -- see each
version's own README.
