# StrykerJS

Synthetic, **deliberately invalid** TypeScript project for **StrykerJS** -- the negative-control twin of `TypeScript-Tools-Clean/StrykerJS`, built so the tool genuinely finds something wrong rather than reporting clean.

Package: @stryker-mutator/core 10.0.0 + vitest-runner + typescript-checker (npm)
Domain: clocktower chime scheduling (ClocktowerChime) (same fixture identity as the clean corpus; only the content is broken)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What was made wrong, and why it's wrong enough

clocktowerChime.test.ts was gutted to a single assertion (chimeCount(0) only) -- isQuietHour is never tested at all. `stryker.config.mjs`'s thresholds stayed meaningful (break: 50, not a token 1-point drop) and Stryker's own real mutation run still measured well under it.

## Command

```bash
stryker run
```

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary, using the identical package-version pins as `TypeScript-Tools-Clean` (only the fixture content differs) -- a family is marked NOT INSTALLED / CODE-ONLY only where the same genuine, reproducible absence already documented in the clean corpus recurs here.

| Family | Status |
| --- | --- |
| node12 | NOT INSTALLED / CODE-ONLY -- vitest, @vitest/coverage-v8, @stryker-mutator/core, @stryker-mutator/vitest-runner, @stryker-mutator/typescript-checker unresolvable for this family (same pin-table gap as the clean corpus). |
| node14 | NOT INSTALLED / CODE-ONLY -- vitest, @vitest/coverage-v8, @stryker-mutator/core, @stryker-mutator/vitest-runner, @stryker-mutator/typescript-checker unresolvable for this family (same pin-table gap as the clean corpus). |
| node20 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
| node24 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
| node26 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
