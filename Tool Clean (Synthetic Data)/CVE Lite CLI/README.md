# CVE Lite CLI

Synthetic, clean-by-design TypeScript project for **CVE Lite CLI**.

Package: cve-lite-cli 1.37.0 (npm, OWASP project)

Domain: granary dependency inventory (GranaryInventory)

**Not installed here**: see Notes for why, and what was checked instead.

## What a passing result looks like

cve-lite falls back to the exact-pinned direct dependencies of `package.json` (typescript 5.9.3, @types/node 26.6.3, cve-lite-cli 1.37.0), queries OSV for them, and reports zero known vulnerabilities.

## Command

```bash
cve-lite . --no-open
```

## Notes

cve-lite-cli reads the lockfile when there is one. These folders have **no lockfile** (a `package-lock.json` in a sub-folder makes Testable treat the folder as its own project and run all tools on it), and cve-lite-cli has a documented fallback for that case: with no lockfile it scans the **direct dependencies in `package.json` that are pinned to an exact version** (`loadPackages()` in `src/parsers/index.ts`, `mode: "manifest-fallback"`; present in 1.37.0 and 1.38.0). Its only vulnerability source is `api.osv.dev`, which returned 403 in the generating session, so no scan result is quoted.
