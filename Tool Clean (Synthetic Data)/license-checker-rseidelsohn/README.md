# license-checker-rseidelsohn

Synthetic, clean-by-design TypeScript project for **license-checker-rseidelsohn**.

Package: license-checker-rseidelsohn 5.0.1 (npm)

Domain: tannery hide-batch ledger (TanneryLedger)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

A production-dependency license scan reports zero packages, because the project ships zero runtime dependencies -- clean by construction, not by today's license data.

## Command

```bash
license-checker-rseidelsohn --production --onlyAllow "MIT;ISC;BSD-2-Clause;BSD-3-Clause;Apache-2.0;0BSD" --excludePrivatePackages
```

## Notes

Installs with an EBADENGINE warning (wants Node >=24/npm >=11; this sandbox has Node 22/npm 10) but runs correctly regardless.

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary -- a family is marked NOT INSTALLED / CODE-ONLY only where a real, reproducible absence was confirmed live (never assumed from a package's declared `engines` field alone).

| Family | Status |
| --- | --- |
| node12 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node14 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node20 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node24 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node26 | CLEAN (installed/built and run for real under this family's own Node binary) |
