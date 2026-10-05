# Bandit

**py3.7 boundary variant -- code-only.** No Python 3.7 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8). This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,7))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after downgrading builtin generic subscripting (`list[int]` etc., which needs 3.9+) to `typing.List`/`typing.Dict`/etc. It was not run against the real tool listed below.


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
