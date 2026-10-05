# Trivy

**py3.11 boundary variant -- NOT INSTALLED (unchanged from the corpus's
original middle version).** Trivy binary unavailable; pip-audit stand-in
measured: 51 known vulnerabilities across 3 of 4 pinned packages.

Synthetic Python project for **Trivy**, deliberately engineered to fail.

Domain: shipping route distance and cost estimation.

## What a genuinely wrong result looks like

No live Trivy binary in this environment (egress-blocked, same as the clean
corpus). Standing in with pip-audit against the same pinned
`requirements.txt`: real advisories against a majority of the declared
dependencies, not a placeholder CVE.

## Command

```bash
trivy fs --scanners vuln,secret --exit-code 1 .
```

Expected (when a real binary is available): non-zero `Total:` vulnerability
count. Measured here instead with the stand-in below.

## Layout

```text
cargoroute/
  pyproject.toml      project root marker; declares the same 4 pins
  src/cargoroute/
    __init__.py
    legs.py              RouteLeg, total_distance
    pricing.py            estimate_cost
  tests/
    test_cargoroute.py
  requirements.txt
```

## Notes

Deliberately old, real pins rather than a zero-dependency manifest:
`Flask==0.12`, `Werkzeug==0.15.3`, `urllib3==1.24.1`, `itsdangerous==0.24`.
This is the inverse of the clean corpus's own zero-dependency Trivy folder,
which exists to be found clean; this folder exists to be found wrong. Trivy
is a standalone binary and its release host is refused at this
environment's egress proxy, so it was NOT invoked here; the vulnerable
dependency claim was verified instead with pip-audit, which reports 51 real
advisories across 3 of the 4 pins. Treat the Trivy result as unproven until
the binary runs. The source itself does not import any of the pinned
packages, so the test suite is unaffected by which versions happen to be
installed locally.

