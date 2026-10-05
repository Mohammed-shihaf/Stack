# npm-check-updates

Synthetic, clean-by-design TypeScript project for **npm-check-updates**.

Package: npm-check-updates 23.1.0 (npm)

Domain: distillery cask batch tracking (DistilleryBatch)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

`ncu` reports "All dependencies match the latest package versions" -- every devDependency, including `typescript` itself, pinned to its current latest release.

## Command

```bash
ncu
```

## Notes

The only folder in the corpus pinned to TypeScript 7.0.2 rather than 5.9.3, deliberately: ncu's job is to flag anything short of latest, and 7.0.2 compiles this folder's plain (non-type-aware-tool) source with plain `tsc` without issue.

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary -- a family is marked NOT INSTALLED / CODE-ONLY only where a real, reproducible absence was confirmed live (never assumed from a package's declared `engines` field alone).

| Family | Status |
| --- | --- |
| node12 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node14 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node20 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node24 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node26 | CLEAN (installed/built and run for real under this family's own Node binary) |
