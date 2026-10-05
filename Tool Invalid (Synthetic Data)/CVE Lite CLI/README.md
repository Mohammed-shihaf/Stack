# CVE Lite CLI

Synthetic, clean-by-design TypeScript project for **CVE Lite CLI**.

Package: cve-lite-cli 1.37.0 (npm, OWASP project)

Domain: granary dependency inventory (GranaryInventory)

**Not installed here**: see Notes for why, and what was checked instead.

## What a passing result looks like

cve-lite would parse package-lock.json, batch-query the OSV database for every resolved package, and report zero known vulnerabilities.

## Command

```bash
cve-lite . --no-open
```

## Notes

cve-lite-cli itself installs and runs fine (real npm package, matches its GitHub description exactly), but its only vulnerability source is `api.osv.dev`, which returns 403 at this sandbox's egress proxy (measured directly, not assumed). Its `--offline` mode only reads a local advisory database that itself must be populated by `cve-lite advisories sync` against that same blocked endpoint -- running `--offline` against the empty database `advisories init` creates does report "no known vulnerabilities", but that is vacuously true (zero advisories to match against), not a real measurement, so it is not counted as a clean result here.
