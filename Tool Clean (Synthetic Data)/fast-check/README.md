# fast-check

Synthetic, clean-by-design TypeScript project for **fast-check**.

Package: fast-check 4.10.2 (npm)

Domain: brewery kettle unit conversion (brewKettle)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

Two real property-based tests (thousands of generated cases each, via vitest) hold for every input: litres round-trip through gallons, and a blended temperature always falls within the range of its two inputs.

## Command

```bash
vitest run
```

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary -- a family is marked NOT INSTALLED / CODE-ONLY only where a real, reproducible absence was confirmed live (never assumed from a package's declared `engines` field alone).

| Family | Status |
| --- | --- |
| node12 | NOT INSTALLED / CODE-ONLY -- fast-check's own property tests run via plain `vitest run`; vitest has no genuine Node 12 release. |
| node14 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node20 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node24 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node26 | CLEAN (installed/built and run for real under this family's own Node binary) |
