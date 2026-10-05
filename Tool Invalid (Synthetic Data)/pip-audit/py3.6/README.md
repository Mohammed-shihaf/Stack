# pip-audit

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists in
the available build environments. This source is verified, not asserted, to
be valid here: `ast.parse(..., feature_version=(3,6))` passes on every
module, and this folder's own pytest suite (3 tests) runs unmodified and
green under an available interpreter after the mechanical downgrade below.
It was not run against the real tool.

`entries.py`'"'"'s `LedgerEntry` is a frozen `@dataclass` in py3.7+; the
stdlib `dataclasses` module needs 3.7+, which 3.6 does not clear, so it was
rewritten to a plain class with an explicit `__init__`. Audited: the type
is never compared, hashed, or introspected via `dataclasses.fields`/
`asdict`/`replace` anywhere in this folder -- only constructed and read by
attribute -- so a plain class is behavior-preserving, proved by the
unmodified pytest suite passing green after the swap.

Synthetic Python project for **pip-audit**, deliberately engineered to fail.

Domain: a categorised personal expense ledger.

## What a genuinely wrong result looks like

`pip-audit --requirement requirements.txt --strict` reports real advisories
against a majority of the pinned dependencies -- not a placeholder CVE, a
genuine PyPI/OSV advisory resolved live against each pinned version.

## Command

```bash
pip-audit --requirement requirements.txt --strict
```

Expected: `Found 74 known vulnerabilities in 7 packages`; exit code 1.

## Layout

```text
ledgerbook/
  pyproject.toml      project root marker; declares the same 5 pins
  src/ledgerbook/
    __init__.py
    entries.py          LedgerEntry, total_for_category
    reporting.py         format_summary
  tests/
    test_ledgerbook.py
  requirements.txt
```

## Notes

Deliberately old, real pins rather than pins that happen to be vulnerable
today by accident: `requests==2.19.1`, `PyYAML==5.3`, `Jinja2==2.10`,
`cryptography==2.3`, `click==8.1.7`. This is the inverse of the clean
corpus's own zero-dependency pip-audit folder, which exists to be found
clean; this folder exists to be found wrong. The source itself (`entries.py`,
`reporting.py`) does not import any of the pinned packages -- same
decoupling the clean corpus uses between its declared dependency set and its
actual imports -- so the test suite runs unmodified regardless of which
versions of these packages happen to be installed locally. `--strict` makes
an audit that could not resolve something fail rather than pass quietly.

