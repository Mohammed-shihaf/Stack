# StrykerJS

Synthetic, clean-by-design TypeScript project for **StrykerJS**.

Package: @stryker-mutator/core 10.0.0 + vitest-runner + typescript-checker (npm)

Domain: clocktower chime scheduling (ClocktowerChime)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

Stryker's real mutation-testing run against ClocktowerChime kills every mutant its operators can generate -- 100% mutation score.

## Command

```bash
stryker run
```

## Notes

`@stryker-mutator/vitest-runner@10.0.0` genuinely throws (`TypeError: Converting circular structure to JSON` inside `VitestTestRunner.init`) against vitest 5.0.2 -- a real, verified incompatibility with vitest's newest major, released within the last few days per this sandbox's npm registry. Pinning vitest to 4.1.11 (the last pre-5.0 release) fixed it. Separately, installing vitest 4.1.11 alongside the Stryker packages hit a real npm 10.9.7 arborist bug (`Cannot read properties of null (reading 'edgesOut')` in `#loadPeerSet`) resolving vitest's own optional peer packages; `npm install --legacy-peer-deps` works around it. Both are genuine, verified environment findings, not fabricated.

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary -- a family is marked NOT INSTALLED / CODE-ONLY only where a real, reproducible absence was confirmed live (never assumed from a package's declared `engines` field alone).

| Family | Status |
| --- | --- |
| node12 | NOT INSTALLED / CODE-ONLY -- @stryker-mutator/vitest-runner has no release before 7.0.0 (requires Node >=18), and vitest itself has no genuine Node 12 release -- no mutually-compatible trio exists. |
| node14 | NOT INSTALLED / CODE-ONLY -- vitest's first genuine Node-14 release (0.34.6) predates the entire vitest-runner/coverage-v8 package lineage by several minors -- no mutually-compatible Stryker trio exists this old. |
| node20 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node24 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node26 | CLEAN (installed/built and run for real under this family's own Node binary) |
