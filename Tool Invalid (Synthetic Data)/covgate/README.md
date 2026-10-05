# covgate

Synthetic, **deliberately invalid** TypeScript project for **covgate** -- the negative-control twin of `TypeScript-Tools-Clean/covgate`, built so the tool genuinely finds something wrong rather than reporting clean.

Package: covgate 0.2.0 (crates.io, built from source)
Domain: smokehouse batch timing (SmokehouseBatch) (same fixture identity as the clean corpus; only the content is broken)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What was made wrong, and why it's wrong enough

covgate's own real git history (one independent repo per family, mirroring how the clean corpus's covgate needed per-family `.git` repos) was rebuilt with a `main` branch holding a small, fully-tested baseline (isDone + hoursRemaining only) and a `feature` branch (checked out as HEAD) adding four new functions (recommendedLevel, percentComplete, describeBatch, mergeBatches) that the unchanged test file never touches. covgate's real `--base main` diff-coverage gate measured these added lines at 0.00% line/branch/function coverage.

## Command

```bash
vitest run --coverage && covgate check coverage/coverage-final.json --base main
```

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary, using the identical package-version pins as `TypeScript-Tools-Clean` (only the fixture content differs) -- a family is marked NOT INSTALLED / CODE-ONLY only where the same genuine, reproducible absence already documented in the clean corpus recurs here.

| Family | Status |
| --- | --- |
| node12 | NOT INSTALLED / CODE-ONLY -- vitest, @vitest/coverage-v8 unresolvable for this family (same pin-table gap as the clean corpus). |
| node14 | NOT INSTALLED / CODE-ONLY -- vitest, @vitest/coverage-v8 unresolvable for this family (same pin-table gap as the clean corpus). |
| node20 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
| node24 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
| node26 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
