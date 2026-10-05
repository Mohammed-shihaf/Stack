# pyan3

Boundary-version matrix for **pyan3**, the deliberate inverse of the Clean
corpus's `pipeflow`: 2 earliest supported versions, 1 middle, 2 end/latest --
matching the Clean corpus's own version-coverage methodology. Each `py3.X/`
subfolder is a complete, independent project; see its own README for exactly
what's wrong and the command.

| Version | Status |
|---|---|
| py3.6 | CODE-ONLY (not run against a live interpreter) |
| py3.7 | CODE-ONLY (not run against a live interpreter) |
| py3.11 | MEASURED WRONG -- 4 of 5 definitions have zero incoming call edges (80%) |
| py3.13 | MEASURED WRONG -- 4 of 5 definitions have zero incoming call edges (80%) |
| py3.14 | MEASURED WRONG -- 4 of 5 definitions have zero incoming call edges (80%) |

3.6 and 3.7 are code-only (see their own READMEs). 3.11, 3.13 and 3.14 were
each measured for real against the actual installed `pyan3` package (2.8.1),
with identical source and identical results.

## What's wrong here

A poker hand scoring package (`cardgame`) where pyan3's own static call
graph (`pyan3 src/cardgame/*.py --uses --defines --colored --grouped --dot
--file graph.dot`) leaves 4 of its 5 definitions with zero incoming call
edges: three scoring rules (`score_flush`, `score_straight`, `score_pair`)
are reached only through `dispatch_score`'s `getattr(module, "score_" +
kind)` -- a call target built from a runtime string, which no static
call-graph builder can resolve back to a specific function -- and
`rank_hand` is called only from the test suite, which pyan3 never scans
since the command only ever points at `src/`. All five functions run
correctly (all 5 tests pass); only pyan3's static graph is wrong about
code that works -- the exact inverse of Clean's rule "stages here call one
another by name" so that "pyan3 resolves every call."

`__init__.py` is kept to a bare docstring on purpose: an earlier draft that
re-exported these functions by name (even just listed as dict values, never
called) found pyan3 draws a traceable "use" edge for that mention alone,
which would have wired every "orphan" back up as connected without a
single real call existing. The orphan ratio is counted by
`analyze_graph.py`, a small script shipped alongside the project that
parses pyan3's own generated `graph.dot` -- not a separate, invented check.
