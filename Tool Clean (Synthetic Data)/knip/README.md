# knip

Synthetic, clean-by-design TypeScript project for **knip**.

Package: knip 6.38.0 (npm)

Domain: canal lockkeeper pass log (LockkeeperLog)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

knip reports zero unused files, exports or dependencies from its declared entry point.

## Command

```bash
knip
```

## Notes

Per the project's own typescript-version-metric-matrix.md, knip 6 dropped `typescript` entirely in favour of `oxc-parser` -- it is version-blind to the TypeScript compiler (Class B).

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary -- a family is marked NOT INSTALLED / CODE-ONLY only where a real, reproducible absence was confirmed live (never assumed from a package's declared `engines` field alone).

| Family | Status |
| --- | --- |
| node12 | NOT INSTALLED / CODE-ONLY -- knip has no Node 12 release (confirmed live). |
| node14 | NOT INSTALLED / CODE-ONLY -- knip has no Node 14 release (confirmed live). |
| node20 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node24 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node26 | CLEAN (installed/built and run for real under this family's own Node binary) |
