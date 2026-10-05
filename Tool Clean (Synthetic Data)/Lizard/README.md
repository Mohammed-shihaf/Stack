# Lizard

Synthetic, clean-by-design TypeScript project for **Lizard**.

Package: lizard 1.24.0 (PyPI)

Domain: vineyard terrace yield estimation (vineyardTerrace)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

`lizard --languages typescript` reports every function under its cyclomatic-complexity (10) and length (60) thresholds -- zero warnings.

## Command

```bash
lizard --languages typescript src/ -C 10 -L 60 -a 5 -w
```

## Notes

Same cross-language, own-tokeniser package already used in the sibling Python/JavaScript/Java corpora; per the project's own typescript-version-metric-matrix.md, Lizard never loads tsc so it is version-blind to the TypeScript compiler entirely (Class B).

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary -- a family is marked NOT INSTALLED / CODE-ONLY only where a real, reproducible absence was confirmed live (never assumed from a package's declared `engines` field alone).

| Family | Status |
| --- | --- |
| node12 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node14 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node20 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node24 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node26 | CLEAN (installed/built and run for real under this family's own Node binary) |
