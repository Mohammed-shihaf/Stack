# eslint-plugin-security

Synthetic, clean-by-design TypeScript project for **eslint-plugin-security**.

Package: eslint-plugin-security 4.1.0 (npm)

Domain: session token vault (SessionVault)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

eslint-plugin-security's recommended rules report zero findings against SessionVault, which issues and verifies tokens with `crypto.randomBytes`/`timingSafeEqual` and no dynamic `require`, `eval`, or unsafe regex.

## Command

```bash
eslint src/
```

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary -- a family is marked NOT INSTALLED / CODE-ONLY only where a real, reproducible absence was confirmed live (never assumed from a package's declared `engines` field alone).

| Family | Status |
| --- | --- |
| node12 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node14 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node20 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node24 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node26 | CLEAN (installed/built and run for real under this family's own Node binary) |
