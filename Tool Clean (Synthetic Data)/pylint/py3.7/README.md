# pylint

**py3.7 boundary variant -- code-only.** No Python 3.7 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8). This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,7))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after downgrading builtin generic subscripting (`list[int]` etc., which needs 3.9+) to `typing.List`/`typing.Dict`/etc. It was not run against the real tool listed below.


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
