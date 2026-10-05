# astroid

**py3.7 boundary variant -- code-only.** No Python 3.7 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8). This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,7))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter (all 5 tests pass). It was not run against the real tool.

Synthetic, invalid-by-design Python project for **astroid**.

Domain: a warehouse dispatch ledger.

## What this package is designed to make astroid get wrong

Clean's version of this folder has astroid infer every name. This one instead has four of its six examined `Name` nodes resolve to nothing, under a genuine astroid analysis: two names only bound through a wildcard import of a module that installs attributes with `globals().update(...)`, one bound only inside a module-level `exec` string, and one `del`-ed before the return that reads it. On 3.13/3.14, the same source was measured for real: **4 of 6 examined names failed to resolve (66%)**. See `py3.13/README.md` for the exact command and output; this folder's source under `src/` is byte-for-byte identical, so that result applies here too in substance.

## Command

```bash
python -m driver
```

(Not run on this version -- see above.)

## Layout

```text
dispatch/
  pyproject.toml      project root marker; zero dependencies
  src/dispatch/
    __init__.py
    _dynamic.py
    ledger.py
  tests/
    test_ledger.py
  driver.py
```

## Notes

`driver.py`'s builtin generic subscripting (`list[str]`, `list[nodes.Name]`, needs 3.9+) was rewritten to `typing.List[...]`; `from __future__ import annotations` stays, since 3.7 clears that floor. Nothing under `src/` or `tests/` changed -- the ledger package uses no type annotations, no `dataclasses`, and no builtin generics to begin with.
