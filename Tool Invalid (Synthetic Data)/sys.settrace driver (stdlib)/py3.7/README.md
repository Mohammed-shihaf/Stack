# sys.settrace driver (stdlib)

**py3.7 boundary variant -- code-only.** No Python 3.7 interpreter exists
in the available build environments. This source (both `src/evrouter`
and `driver.py`) is verified, not asserted: `ast.parse(...,
feature_version=(3, 7))` passes on every file, and this folder's own
pytest suite runs unmodified and green under an available interpreter, and
`driver.py` itself was run under an available interpreter from this
folder and reproduced the same traced ratio as py3.11/py3.13/py3.14. It was
not run against a real py3.7 interpreter, because none exists.

`driver.py` here is mechanically downgraded the same way Clean's corpus
downgraded this file: the two builtin-generic annotations (`dict[str,
set[int]]`, `set[int]`) are rewritten to `typing.Dict`/`typing.Set`.
`from __future__ import annotations` is kept, since it is valid on 3.7+ and defers the annotations anyway.
`src/evrouter/*.py` needed no change at all: no builtin generics,
`dataclasses` or future-annotations import appear there.

Synthetic, deliberately-wrong Python project for **sys.settrace driver
(stdlib)**.

Domain: a small event router, retry policy and state-transition table,
traced by a stdlib coverage driver.

## What a wrong result would look like

`exercise()` only drives one event route and one state transition, leaving
most of `policy.py`, `router.py` and `transitions.py` untraced. Running
the downgraded `driver.py` under an available interpreter (sanity check,
not a 3.3.7 measurement) reproduces the same real ratio as every
live-measured version:

```text
evrouter: 38% (22/57 statements)
```

**38% < 50%.**

## Command (not run against a real 3.3.7 interpreter)

```bash
python driver.py
```

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
  driver.py            downgraded: typing.Dict/Set in place of dict/set
```
