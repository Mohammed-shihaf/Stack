# dependency-cruiser

Synthetic, clean-by-design TypeScript project for **dependency-cruiser**.

Package: dependency-cruiser 18.4.0 (npm)

Domain: spice market pricing ledger (SpiceMarketLedger)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

dependency-cruiser's real module graph over the spice-market source has zero circular-dependency and zero orphan-module violations.

## Command

```bash
depcruise src --config .dependency-cruiser.cjs --output-type err
```

## Notes

Borrows the host TypeScript compiler (per the project's own typescript-version-metric-matrix.md) rather than bundling one, so it tracks whatever `typescript` version this folder pins (5.9.3).

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary -- a family is marked NOT INSTALLED / CODE-ONLY only where a real, reproducible absence was confirmed live (never assumed from a package's declared `engines` field alone).

| Family | Status |
| --- | --- |
| node12 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node14 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node20 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node24 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node26 | CLEAN (installed/built and run for real under this family's own Node binary) |
