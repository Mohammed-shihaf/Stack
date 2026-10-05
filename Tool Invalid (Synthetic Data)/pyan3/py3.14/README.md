# pyan3

**py3.14 boundary variant.** MEASURED WRONG: pyan3's own static call graph genuinely leaves a majority of this package's definitions with zero incoming edges.

Synthetic, invalid-by-design Python project for **pyan3** -- the deliberate inverse of the Clean corpus's `pipeflow`.

Domain: poker hand scoring.

## What's wrong here, and why it's genuine

Clean's version of this folder has pyan3 connect every definition into the
call graph: stages call one another by name, so every def has a traceable
edge. This one instead reaches three of its four scoring rules
(`score_flush`, `score_straight`, `score_pair`) only through
`dispatch_score`'s `getattr(module, "score_" + kind)` -- a call target
built from a runtime string, which a static call-graph builder cannot
resolve back to any specific function -- and `rank_hand` is never called
from `src/` at all (only from the test suite, which pyan3 never scans,
since the command below only ever points at `src/cardgame/*.py`). Only
`dispatch_score` has one real, traceable incoming edge, from `rank_hand`.
`__init__.py` is kept to a bare docstring and re-exports nothing, since
pyan3 treats a top-level *mention* of a function's name -- even as an
unused import -- as a traceable reference in its own right; re-exporting
these functions would have wired them back up as "connected" without a
single real call existing anywhere.

## Command

```bash
pyan3 src/cardgame/*.py --uses --defines --colored --grouped --dot --file graph.dot
```

Expected (and measured): a DOT graph, exit 0. The orphaning is visible in
the graph's own edges, counted by `analyze_graph.py` (not part of the tool
invocation -- a small script that only reads pyan3's own output):

```bash
python analyze_graph.py graph.dot
```

Measured: **4 of 5 definitions have zero incoming call edges (80%)**.

```text
orphan: cardgame__scoring__rank_hand
orphan: cardgame__scoring__score_flush
orphan: cardgame__scoring__score_pair
orphan: cardgame__scoring__score_straight
4 orphaned definitions
4 of 5 definitions have zero incoming call edges (80%)
```

The one edge pyan3's real analysis does draw: `rank_hand -> dispatch_score`.

Tool version: **pyan3 2.8.1** (interpreter: CPython 3.14.0rc2).

## Layout

```text
cardgame/
  pyproject.toml      project root marker; zero dependencies
  src/cardgame/
    __init__.py         bare docstring -- re-exports nothing
    scoring.py           the five definitions the graph is built from
  tests/
    test_scoring.py       covers every rule directly; pyan3 never scans this
  analyze_graph.py        reads pyan3's own graph.dot; not part of the command
```

## Notes

All five tests pass: every function runs correctly when called directly.
pyan3's static graph is "wrong" only in the sense Clean's own README
predicts -- "a pipeline assembled through a registry of callables or
`getattr` dispatch produces a graph full of holes while the code runs
perfectly" -- applied here to a `getattr`-based dispatch table instead of a
dict-based one (a module-level dict whose values *name* the functions
directly turned out, when tested, to still create a traceable pyan3 edge
from the module to each named function, since pyan3 treats that mention as
a use in its own right; `getattr` on a computed string has no such name to
find).
