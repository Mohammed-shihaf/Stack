# pip-audit

**py3.14 boundary variant -- measured (interpreter pinned to 3.14.0rc2, matching this project's convention elsewhere).** A real Python 3.14 interpreter and this tool's own current release were both actually installed and invoked against this folder in the build environment; the result below is real, not asserted.


Synthetic, clean-by-design Python project for **pip-audit**.

Domain: inclusive calendar date ranges.

## What a passing result looks like

No known vulnerabilities found. The project declares no dependencies, so the dependency set audited is empty and there is nothing for an advisory to match.

## Command

```bash
pip-audit --requirement requirements.txt --strict
```

Expected: `No known vulnerabilities found`

## Layout

```text
daterange/
  pyproject.toml      project root marker; zero dependencies
  src/daterange/
    __init__.py
    span.py
    calendar.py
  tests/
    test_daterange.py
  requirements.txt
```

## Notes

Deliberately zero dependencies rather than dependencies that are clean today. This is the inverse of the corpora's planted-CVE pins (`requests==2.31.0`, `Jinja2==3.1.3`, `urllib3==2.0.6`, `cryptography==42.0.0`, `paramiko==2.4.1`): those exist to be found, and this folder exists to be found clean. `--strict` makes an audit that could not resolve something fail rather than pass quietly.
