# monocart-coverage-reports

Synthetic, **deliberately invalid** TypeScript project for **monocart-coverage-reports** -- the negative-control twin of `TypeScript-Tools-Clean/monocart-coverage-reports`, built so the tool genuinely finds something wrong rather than reporting clean.

Package: monocart-coverage-reports 2.13.0 (npm)
Domain: quarry crane lift capacity (QuarryCrane) (same fixture identity as the clean corpus; only the content is broken)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What was made wrong, and why it's wrong enough

quarryCrane.ts grew five new, real, reachable functions (swingArcDegrees, isOverSwingLimit, craneUtilization, recommendedCrewSize, describeLift) that tools/driver.ts never calls. The bare `mcr` CLI always exits 0 once it generates a report, so `mcr.config.cjs`'s `onEnd` hook reads monocart's own measured byte/statement coverage percentage back and fails when it is under 50%. Measured: 39.55%.

## Command

```bash
mcr -c mcr.config.cjs node build/tools/driver.js
```

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary, using the identical package-version pins as `TypeScript-Tools-Clean` (only the fixture content differs) -- a family is marked NOT INSTALLED / CODE-ONLY only where the same genuine, reproducible absence already documented in the clean corpus recurs here.

| Family | Status |
| --- | --- |
| node12 | NOT INSTALLED / CODE-ONLY -- monocart-coverage-reports unresolvable for this family (same pin-table gap as the clean corpus). |
| node14 | NOT INSTALLED / CODE-ONLY -- monocart-coverage-reports unresolvable for this family (same pin-table gap as the clean corpus). |
| node20 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
| node24 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
| node26 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
