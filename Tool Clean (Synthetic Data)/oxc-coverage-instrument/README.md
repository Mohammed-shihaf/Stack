# oxc-coverage-instrument

Synthetic, clean-by-design TypeScript project for **oxc-coverage-instrument**.

Package: oxc-coverage-instrument 0.13.0 (npm)

Domain: shipyard dock draft-limited berth reservation (ShipyardDock)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

vitest's Istanbul coverage provider, instrumented by oxc-coverage-instrument's real native Oxc-AST instrumenter instead of istanbul-lib-instrument, reports 100% statement/branch/function/line coverage.

## Command

```bash
vitest run --coverage
```

## Notes

Wired in via the package's own documented `oxc-coverage-instrument/vitest` adapter (`createOxcInstrumenter`), which needs `@vitest/coverage-istanbul` >=4.1.5 -- pinned to vitest/coverage-istanbul 4.1.11 here for the same reason as the StrykerJS folder.

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary -- a family is marked NOT INSTALLED / CODE-ONLY only where a real, reproducible absence was confirmed live (never assumed from a package's declared `engines` field alone).

| Family | Status |
| --- | --- |
| node12 | NOT INSTALLED / CODE-ONLY -- Needs @vitest/coverage-istanbul as its adapter target; vitest has no genuine Node 12 release. |
| node14 | NOT INSTALLED / CODE-ONLY -- Needs @vitest/coverage-istanbul >=4.1.5 per its own documented adapter; vitest 0.34.6 (node14's own ceiling) predates it by several majors. |
| node20 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node24 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node26 | CLEAN (installed/built and run for real under this family's own Node binary) |
