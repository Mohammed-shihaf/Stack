# jscpd

Synthetic, clean-by-design TypeScript project for **jscpd**.

Package: jscpd 5.3.3 (npm)

Domain: apiary hive inspection log (ApiaryHive)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

`jscpd` finds zero duplicate blocks in ApiaryHive's own source at 5 lines / 30 tokens.

## Command

```bash
jscpd src/ --min-lines 5 --min-tokens 30 --threshold 0
```

## Notes

Same package already used corpus-wide (Python/JavaScript/Java) both as a named tool's own folder and as the corpus-wide cross-folder duplication check.

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary -- a family is marked NOT INSTALLED / CODE-ONLY only where a real, reproducible absence was confirmed live (never assumed from a package's declared `engines` field alone).

| Family | Status |
| --- | --- |
| node12 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node14 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node20 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node24 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node26 | CLEAN (installed/built and run for real under this family's own Node binary) |
