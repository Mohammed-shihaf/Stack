# npm-check-updates

Synthetic, **deliberately invalid** TypeScript project for **npm-check-updates** -- the negative-control twin of `TypeScript-Tools-Clean/npm-check-updates`, built so the tool genuinely finds something wrong rather than reporting clean.

Package: npm-check-updates 23.1.0 (npm)
Domain: distillery cask batch tracking (DistilleryBatch) (same fixture identity as the clean corpus; only the content is broken)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What was made wrong, and why it's wrong enough

package.json's devDependencies were pushed back to genuinely ancient releases (eslint 5.16.0, prettier 1.19.1, lodash 3.10.1, chalk 1.1.3) alongside the corpus's normal typescript/@types/node pins. `ncu` alone always exits 0 (it's informational by default), so `tools/checkUpdates.js` runs it with `--jsonUpgraded` and fails when the stale share of devDependencies is >= 50%. Measured: 85.7% (6 of 7) stale.

## Command

```bash
ncu; node tools/checkUpdates.js
```

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary, using the identical package-version pins as `TypeScript-Tools-Clean` (only the fixture content differs) -- a family is marked NOT INSTALLED / CODE-ONLY only where the same genuine, reproducible absence already documented in the clean corpus recurs here.

| Family | Status |
| --- | --- |
| node12 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
| node14 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
| node20 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
| node24 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
| node26 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
