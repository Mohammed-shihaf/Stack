# Bandit

**py3.14 boundary variant -- measured (interpreter pinned to 3.14.0rc2, matching this project's convention elsewhere).** A real Python 3.14 interpreter and this tool's own current release were both actually installed and invoked against this folder in the build environment; the result below is real, not asserted.


Synthetic, clean-by-design Python project for **Bandit**.

Domain: warehouse reorder levels.

## What a passing result looks like

Bandit reports zero issues at every severity. The package uses no `subprocess`, `os.system`, `eval`, `exec`, `pickle`, `yaml.load`, `tempfile.mktemp`, weak hash or `random` call, carries no hardcoded credential, and contains no `assert` (B101 has no exemption outside tests, so the asserts live in `tests/` only).

## Command

```bash
bandit -r src/ -f screen
```

Expected: `No issues identified.`

## Layout

```text
stockroom/
  pyproject.toml      project root marker; zero dependencies
  src/stockroom/
    __init__.py
    levels.py
    registry.py
  tests/
    test_stockroom.py
```

## Notes

Point Bandit at `src/` rather than the folder root. Test files use `assert` by necessity, which B101 flags wherever it finds it.
