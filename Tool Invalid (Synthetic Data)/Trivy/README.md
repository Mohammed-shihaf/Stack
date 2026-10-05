# Trivy

Boundary-version matrix for **Trivy** -- the deliberate inverse of
`Python-Tools-Clean`'s `Trivy` folder. Trivy is a standalone binary and,
exactly as in the clean corpus, its release host is refused at this
environment's egress proxy: **NOT INSTALLED at every version**, carried
forward unchanged.

| Version | Status |
|---|---|
| py3.6 | CODE-ONLY (not run against a live interpreter) |
| py3.7 | CODE-ONLY (not run against a live interpreter) |
| py3.11 | NOT INSTALLED |
| py3.13 | NOT INSTALLED |
| py3.14 | NOT INSTALLED |

Same binary-egress block as the clean corpus's own Trivy folder. Mirroring
the clean corpus's own cross-reference (there, pip-audit stood in to confirm
a zero-dependency claim), **pip-audit stands in here too**, but inverted: it
was actually run against this folder's own pinned, vulnerable
`requirements.txt` and found a real, non-trivial result -- the same evidence
Trivy's own `fs --scanners vuln` would be expected to surface.

## Stand-in result (pip-audit, identical at 3.11/3.13/3.14)

```
pip-audit --requirement requirements.txt --strict
```

**Found 51 known vulnerabilities in 3 packages.** `requirements.txt` pins
`Flask==0.12`, `Werkzeug==0.15.3`, `urllib3==1.24.1` and `itsdangerous==0.24`
-- **3 of 4 pinned packages (75%)** carry a real reported advisory (Flask,
Werkzeug and urllib3 all do; `itsdangerous==0.24` resolved with none found,
which is why the folder reports 75% rather than 100%). Exit code 1.

Re-run the real `trivy` binary before treating this folder as proven: a
stand-in is evidence, not proof -- the same caveat the clean corpus states
for its own (negative) Trivy result.
