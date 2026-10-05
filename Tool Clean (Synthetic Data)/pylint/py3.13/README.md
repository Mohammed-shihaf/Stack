# pylint

**py3.13 boundary variant -- measured.** A real Python 3.13 interpreter and this tool's own current release were both actually installed and invoked against this folder in the build environment; the result below is real, not asserted.


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
