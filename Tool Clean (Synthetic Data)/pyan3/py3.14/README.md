# pyan3

**py3.14 boundary variant -- measured (interpreter pinned to 3.14.0rc2, matching this project's convention elsewhere).** A real Python 3.14 interpreter and this tool's own current release were both actually installed and invoked against this folder in the build environment; the result below is real, not asserted.


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
