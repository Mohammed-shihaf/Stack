# Trivy

**py3.6 boundary variant -- code-only.** No Python 3.6 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8), and most of this tool's current releases no longer install on an interpreter that old anyway. This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,6))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after the mechanical 3.6 downgrade (builtin generics -> typing.X, no stdlib `dataclasses`, no `from __future__ import annotations`). It was not run against the real tool listed below.


Synthetic, clean-by-design Python project for **Trivy**.

Domain: column summaries over CSV rows.

## What a passing result looks like

Zero vulnerabilities and zero secrets. The manifest declares **no dependencies at all**, so there is no package for an advisory to attach to, and no credential, token or private key appears anywhere in the tree.

## Command

```bash
trivy fs --scanners vuln,secret --exit-code 1 .
```

Expected: `Total: 0`

## Layout

```text
tallysheet/
  pyproject.toml      project root marker; zero dependencies
  src/tallysheet/
    __init__.py
    reader.py
    summary.py
  tests/
    test_tallysheet.py
  requirements.txt
```

## Notes

Clean by construction rather than by today's advisory feed. A folder pinned to versions that happen to be clean this week becomes dirty the week a CVE lands, with nothing in the folder having changed -- so the dependency list is empty and the package is pure standard library. Trivy is a standalone binary and its release host is refused at this environment's egress proxy, so it was NOT invoked here; the zero-dependency claim was verified instead with `pip-audit`, which reports no known vulnerabilities. Treat the Trivy result as unproven until the binary runs.
