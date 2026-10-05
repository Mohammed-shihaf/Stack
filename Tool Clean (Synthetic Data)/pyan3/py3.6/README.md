# pyan3

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8), and most of this tool's current releases no longer install on an interpreter that old anyway. This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,6))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after the mechanical 3.6 downgrade (builtin generics -> typing.X, no stdlib `dataclasses`, no `from __future__ import annotations`). It was not run against the real tool listed below.


Synthetic, clean-by-design Python project for **pyan3**.

Domain: a three-stage processing pipeline.

## What a passing result looks like

pyan3 builds the call graph without error and resolves every call to a defined node: the emitted graph has no unresolved reference and the stage-to-stage edges appear as written.

## Command

```bash
pyan3 src/pipeflow/*.py --uses --defines --colored --grouped --dot --file graph.dot
```

Expected: `a DOT graph with defines and uses edges; exit 0`

## Layout

```text
pipeflow/
  pyproject.toml      project root marker; zero dependencies
  src/pipeflow/
    __init__.py
    stages.py
    pipeline.py
  tests/
    test_pipeflow.py
```

## Notes

Call-graph tools resolve static call sites, so a pipeline assembled through a registry of callables or `getattr` dispatch produces a graph full of holes while the code runs perfectly. Stages here call one another by name. Verified flags: `--uses`, `--defines`, `--colored`, `--grouped`, `--dot`, `--file`.
