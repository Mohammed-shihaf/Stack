# debtmap

Synthetic, clean-by-design TypeScript project for **debtmap**.

Package: debtmap 0.24.1 (crates.io, built from source)

Domain: windmill gear ratio calculation (windmillGears)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

debtmap's real tree-sitter-based TypeScript analysis reports zero technical-debt items above its default score threshold.

## Command

```bash
debtmap analyze src --languages typescript
```

## Notes

Not on npm (same finding as the sibling JavaScript corpus); real Rust CLI with genuine tree-sitter TypeScript support, built from crates.io in this session. Pointing it at `.` instead of `src` made it hang past 2 minutes walking `node_modules` -- scoping the path to `src` avoids that and is the correct usage regardless.

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary -- a family is marked NOT INSTALLED / CODE-ONLY only where a real, reproducible absence was confirmed live (never assumed from a package's declared `engines` field alone).

| Family | Status |
| --- | --- |
| node12 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node14 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node20 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node24 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node26 | CLEAN (installed/built and run for real under this family's own Node binary) |
