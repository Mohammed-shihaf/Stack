# oxc-coverage-instrument

Synthetic, **deliberately invalid** TypeScript project for **oxc-coverage-instrument** -- the negative-control twin of `TypeScript-Tools-Clean/oxc-coverage-instrument`, built so the tool genuinely finds something wrong rather than reporting clean.

Package: oxc-coverage-instrument 0.13.0 (npm)
Domain: shipyard dock draft-limited berth reservation (ShipyardDock) (same fixture identity as the clean corpus; only the content is broken)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What was made wrong, and why it's wrong enough

shipyardDock.ts grew five new, real, reachable methods (scheduleMaintenance, maintenanceCount, clearMaintenanceLog, isOverDraftLimit, slotIds) that the unchanged test file never exercises. vitest.config.ts's thresholds stayed at 100/100/100/100 (unchanged from the clean corpus), so real oxc-instrumented coverage measured well under them. Measured: 34.61% statements/lines, 20% branches, 37.5% functions.

## Command

```bash
vitest run --coverage
```

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary, using the identical package-version pins as `TypeScript-Tools-Clean` (only the fixture content differs) -- a family is marked NOT INSTALLED / CODE-ONLY only where the same genuine, reproducible absence already documented in the clean corpus recurs here.

| Family | Status |
| --- | --- |
| node12 | NOT INSTALLED / CODE-ONLY -- vitest, @vitest/coverage-istanbul unresolvable for this family (same pin-table gap as the clean corpus). |
| node14 | NOT INSTALLED / CODE-ONLY -- vitest, @vitest/coverage-istanbul unresolvable for this family (same pin-table gap as the clean corpus). |
| node20 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
| node24 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
| node26 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
