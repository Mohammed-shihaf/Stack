# Bandit

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists in
the available build environments, and bandit's own current release no
longer installs on an interpreter that old anyway. This source is verified,
not asserted, to be valid here: `ast.parse(..., feature_version=(3,6))`
passes on every module, and this folder's own pytest suite (7 tests) runs
unmodified and green under an available interpreter. It was not run against
the real tool.

This folder uses no builtin generic subscripting, no stdlib `dataclasses`
and no `from __future__ import annotations`, so no mechanical downgrade was
needed -- the source is byte-for-byte identical to py3.7/py3.11/py3.13/py3.14.

Synthetic Python project for **Bandit**, deliberately engineered to fail.

Domain: shift roster scheduling for an hourly workforce.

## What a genuinely wrong result looks like

Bandit reports real, non-suppressed issues on a majority of the package's
functions: `hashlib.md5()` used for a PIN digest (B324), `subprocess.run(...,
shell=True)` to sync a schedule export (B602), `pickle.loads()` to restore a
cached roster (B301), `tempfile.mktemp()` for a scratch export path (B306), a
hardcoded API secret on a module constant (B105), plus the B403/B404
import-level blacklist notes for `pickle` and `subprocess`. No `# nosec`
anywhere.

## Command

```bash
bandit -r src/ -f screen
```

Expected: 7 real issues (3 Low, 2 Medium, 2 High); exit code 1.

## Layout

```text
shiftroster/
  pyproject.toml      project root marker; zero dependencies
  src/shiftroster/
    __init__.py
    hashing.py         hash_employee_pin -- weak MD5 (B324)
    commands.py        sync_schedule -- shell=True (B602)
    cache.py           load_cached_roster -- unsafe pickle (B301)
    tempfiles.py       scratch_path -- insecure mktemp (B306)
    secrets.py          API_SECRET -- hardcoded credential (B105)
    utils.py            total_hours, format_shift_label -- clean
  tests/
    test_shiftroster.py
```

## Notes

4 of 6 functions (66.7%) each trigger a genuine, distinct Bandit finding;
`total_hours` and `format_shift_label` are left clean so the result is
majority-wrong rather than unanimous. Point Bandit at `src/` rather than the
folder root, same as the clean corpus.

