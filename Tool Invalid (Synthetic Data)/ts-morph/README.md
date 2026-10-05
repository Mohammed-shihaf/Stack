# ts-morph

Synthetic, **deliberately invalid** TypeScript project for **ts-morph** -- the negative-control twin of `TypeScript-Tools-Clean/ts-morph`, built so the tool genuinely finds something wrong rather than reporting clean.

Package: ts-morph 28.0.0 (npm)
Domain: orchard tree-block survey (OrchardSurvey) (same fixture identity as the clean corpus; only the content is broken)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What was made wrong, and why it's wrong enough

orchardSurvey.ts was given four genuine compiler errors spread across its four methods: a read of a property that doesn't exist on TreeBlock, a string assigned to a `number`, a call to a method that doesn't exist on the find() result, and a reference to an undeclared identifier. ts-morph's whole purpose is confirming a project's types resolve cleanly, so the most direct, strongest form of that finding is a project that does not type-check at all -- which also means the harness's own `npx tsc` build-first gate fails before ts-morph's own checker ever runs. That build failure *is* the finding here, not a different failure mode standing in for one; see the family table below.

## Command

```bash
tsc && node build/tools/checkResolution.js
```

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary, using the identical package-version pins as `TypeScript-Tools-Clean` (only the fixture content differs) -- a family is marked NOT INSTALLED / CODE-ONLY only where the same genuine, reproducible absence already documented in the clean corpus recurs here.

| Family | Status |
| --- | --- |
| node12 | FINDING (project fails to type-check -- `tsc` build itself fails, rc=2; this is the intended defect, see tool note above) |
| node14 | FINDING (project fails to type-check -- `tsc` build itself fails, rc=2; this is the intended defect, see tool note above) |
| node20 | FINDING (project fails to type-check -- `tsc` build itself fails, rc=2; this is the intended defect, see tool note above) |
| node24 | FINDING (project fails to type-check -- `tsc` build itself fails, rc=2; this is the intended defect, see tool note above) |
| node26 | FINDING (project fails to type-check -- `tsc` build itself fails, rc=2; this is the intended defect, see tool note above) |
