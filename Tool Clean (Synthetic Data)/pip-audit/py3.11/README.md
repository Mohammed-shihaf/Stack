# pip-audit

**py3.11 boundary variant -- the corpus's original middle version.** Measured clean or documented not-installed exactly as recorded in this corpus's very first build; unchanged by the later boundary-version work.


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
