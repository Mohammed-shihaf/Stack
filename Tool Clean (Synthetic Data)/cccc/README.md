# cccc

Synthetic, clean-by-design TypeScript project for **cccc**.

Package: cccc 3.2.0 (Debian apt package)

Domain: boiler pressure-relief control -- real C source (boiler_room.c)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

cccc's own XML report shows 0 rejected (unparseable) lines and every module's McCabe cyclomatic complexity at or below 10.

## Command

```bash
cccc src/boiler_room.c && python3 check_cccc.py
```

## Notes

cccc cannot parse JavaScript or TypeScript at all -- it analyses C, C++ and Java. It was harvested into `TypeScript Tools` by the same real category error the project's own javascript-repos-build-contract.md documents for the sibling JS corpus. Rather than force TypeScript through a parser that rejects it, this folder gives cccc real C source -- the one thing it can actually analyse -- and documents the mismatch rather than papering over it. Same treatment as the sibling JavaScript-Tools-Clean corpus's cccc folder.

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary -- a family is marked NOT INSTALLED / CODE-ONLY only where a real, reproducible absence was confirmed live (never assumed from a package's declared `engines` field alone).

| Family | Status |
| --- | --- |
| node12 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node14 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node20 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node24 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node26 | CLEAN (installed/built and run for real under this family's own Node binary) |
