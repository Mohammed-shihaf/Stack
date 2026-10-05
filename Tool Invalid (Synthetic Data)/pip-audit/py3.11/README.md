# pip-audit

**py3.11 boundary variant -- measured.** pip-audit 2.10.1 actually installed
and invoked against this folder, under Python 3.11.15. Result: 74 known
vulnerabilities across 7 resolved packages (5 of 5 pinned flagged).

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

