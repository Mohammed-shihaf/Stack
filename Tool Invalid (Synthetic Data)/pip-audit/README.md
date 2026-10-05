# pip-audit

Boundary-version matrix for **pip-audit** -- the deliberate inverse of
`Python-Tools-Clean`'s `pip-audit` folder. Clean declared zero dependencies
by construction; this folder inverts that on purpose, pinning real,
old, genuinely-CVE'd package versions as its planted defect.

| Version | Status |
|---|---|
| py3.6 | CODE-ONLY (not run against a live interpreter) |
| py3.7 | CODE-ONLY (not run against a live interpreter) |
| py3.11 | MEASURED FINDING |
| py3.13 | MEASURED FINDING |
| py3.14 | MEASURED FINDING |

3.6 and 3.7 are code-only (see their own READMEs). 3.11, 3.13 and 3.14 were
each measured for real: pip-audit 2.10.1 actually resolved and audited
`requirements.txt` against the live PyPI advisory feed, under that version's
own real interpreter.

## Measured result (identical at 3.11, 3.13 and 3.14)

```
pip-audit --requirement requirements.txt --strict
```

**Found 74 known vulnerabilities in 7 packages.** The 5 pins in
`requirements.txt` are `requests==2.19.1`, `PyYAML==5.3`, `Jinja2==2.10`,
`cryptography==2.3` and `click==8.1.7` -- **all 5 of 5 (100%)** carry at
least one real reported advisory (`PYSEC-2023-74`, `PYSEC-2020-96`,
`PYSEC-2019-217`, `PYSEC-2026-1283` and `PYSEC-2026-2132` among them). The
dependency resolver also pulled in `idna` and `urllib3` transitively, and
both of those came back flagged too (7 of 7 resolved packages total).
`--strict` makes the command fail outright (exit code 1) rather than pass
quietly on anything it couldn't resolve.

See each `py3.X/README.md` for that version's own notes.
