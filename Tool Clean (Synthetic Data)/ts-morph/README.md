# ts-morph

Synthetic, clean-by-design TypeScript project for **ts-morph**.

Package: ts-morph 28.0.0 (npm)

Domain: orchard tree-block survey (OrchardSurvey)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

ts-morph's real Compiler-API-backed `Project` loads OrchardSurvey with zero pre-emit diagnostics and zero unresolved identifiers.

## Command

```bash
node build/tools/checkResolution.js
```

## Notes

Per the project's own typescript-version-metric-matrix.md, ts-morph 28.0.0 bundles its own TypeScript ~6.0.2 compiler internally regardless of the project's own pinned 5.9.3 -- consistent behaviour, not a version mismatch bug.

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary -- a family is marked NOT INSTALLED / CODE-ONLY only where a real, reproducible absence was confirmed live (never assumed from a package's declared `engines` field alone).

| Family | Status |
| --- | --- |
| node12 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node14 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node20 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node24 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node26 | CLEAN (installed/built and run for real under this family's own Node binary) |
