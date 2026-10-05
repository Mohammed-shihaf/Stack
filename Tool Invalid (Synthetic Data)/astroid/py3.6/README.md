# astroid

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8), and astroid's current releases no longer install on an interpreter that old anyway. This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,6))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter (all 5 tests pass -- the ledger's runtime behavior is correct regardless of Python version). It was not run against the real tool.

Synthetic, invalid-by-design Python project for **astroid**.

Domain: a warehouse dispatch ledger.

## What this package is designed to make astroid get wrong

Clean's version of this folder has astroid infer every name. This one instead has four of its six examined `Name` nodes resolve to nothing, under a genuine astroid analysis: two names only bound through a wildcard import of a module that installs attributes with `globals().update(...)`, one bound only inside a module-level `exec` string, and one `del`-ed before the return that reads it. On 3.13/3.14, the same source was measured for real: **4 of 6 examined names failed to resolve (66%)**. See `py3.13/README.md` for the exact command and output; this folder's source is identical (no builtin generics, no `dataclasses`, nothing that needed downgrading for the 3.9 or 3.7 floor), so that result applies here too in substance, just not measured against a live 3.6 interpreter.

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

Only `driver.py` needed a mechanical change for this version: `from __future__ import annotations` (3.7+) was replaced with explicit `typing.List` annotations, since this folder's driver uses no other syntax with a floor above 3.6. Nothing under `src/` or `tests/` changed at all -- the ledger package uses no type annotations, no `dataclasses`, and no builtin generic subscripting, so it needed no downgrade to clear the 3.6 floor.
