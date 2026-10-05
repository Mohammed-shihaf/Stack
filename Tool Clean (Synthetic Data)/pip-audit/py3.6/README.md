# pip-audit

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8), and most of this tool's current releases no longer install on an interpreter that old anyway. This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,6))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after the mechanical 3.6 downgrade (builtin generics -> typing.X, no stdlib `dataclasses`, no `from __future__ import annotations`). It was not run against the real tool listed below.


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
