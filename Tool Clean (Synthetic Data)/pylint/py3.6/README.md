# pylint

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8), and most of this tool's current releases no longer install on an interpreter that old anyway. This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,6))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after the mechanical 3.6 downgrade (builtin generics -> typing.X, no stdlib `dataclasses`, no `from __future__ import annotations`). It was not run against the real tool listed below.


Synthetic, clean-by-design Python project for **pylint**.

Domain: a lending-library catalogue.

## What a passing result looks like

`pylint` scores **10.00/10** with no message of any category: every module, class and function is documented, every name follows the conventions, nothing is unused, imports are ordered, and no line exceeds the limit.

## Command

```bash
pylint src/shelfmark --fail-under=10
```

Expected: `Your code has been rated at 10.00/10`

## Layout

```text
shelfmark/
  pyproject.toml      project root marker; zero dependencies
  src/shelfmark/
    __init__.py
    records.py
    catalogue.py
  tests/
    test_shelfmark.py
```

## Notes

`--fail-under=10` is what turns 10.00/10 into an exit code; without it pylint exits 0 on a 9.5 and the folder would silently stop being clean. No `# pylint: disable` comment appears anywhere -- a suppressed message is not a clean result.
