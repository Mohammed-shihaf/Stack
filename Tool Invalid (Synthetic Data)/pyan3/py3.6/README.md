# pyan3

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8). This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,6))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter (all 5 tests pass). It was not run against the real tool.

Synthetic, invalid-by-design Python project for **pyan3**.

Domain: poker hand scoring.

## What this package is designed to make pyan3 get wrong

Clean's version of this folder has pyan3 connect every definition into the
call graph. This one instead reaches three of its four scoring rules only
through a `getattr`-computed call target, and a fourth (`rank_hand`) only
from the test suite pyan3 never scans. On 3.13/3.14, the identical source
was measured for real: **4 of 5 definitions have zero incoming call edges
(80%)**. See `py3.13/README.md` for the full breakdown, the exact command,
and the graph output; `src/` here is byte-for-byte identical (no type
annotations needing a downgrade), so that result applies here too.

## Command

```bash
pyan3 src/cardgame/*.py --uses --defines --colored --grouped --dot --file graph.dot
python analyze_graph.py graph.dot
```

(Not run on this version -- see above.)

## Layout

```text
cardgame/
  pyproject.toml      project root marker; zero dependencies
  src/cardgame/
    __init__.py
    scoring.py
  tests/
    test_scoring.py
  analyze_graph.py
```

## Notes

`analyze_graph.py`'s `from __future__ import annotations` (3.7+) was
dropped; it guarded no builtin generic subscripting, so nothing else
needed rewriting. Nothing under `src/` or `tests/` changed at all -- the
scoring package uses no type annotations beyond bare `list`/`str`/`int`,
none of which need subscripting.
