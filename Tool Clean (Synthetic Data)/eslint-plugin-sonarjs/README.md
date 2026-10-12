# eslint-plugin-sonarjs

Synthetic, clean-by-design TypeScript project for **eslint-plugin-sonarjs**.

Package: eslint-plugin-sonarjs 4.2.2 (npm)

Domain: toll booth lane pricing (TollBooth)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

eslint-plugin-sonarjs's recommended config reports zero cognitive-complexity, duplicate-branch or code-smell findings against TollBooth.

## Command

```bash
eslint src/
```

## Notes

This is the one real, standalone way to exercise SonarJS's rule engine without a SonarQube/SonarCloud server -- see the separate SonarJS folder's notes.

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary -- a family is marked NOT INSTALLED / CODE-ONLY only where a real, reproducible absence was confirmed live (never assumed from a package's declared `engines` field alone).

| Family | Status |
| --- | --- |
| node12 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node14 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node20 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node24 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node26 | CLEAN (installed/built and run for real under this family's own Node binary) |
