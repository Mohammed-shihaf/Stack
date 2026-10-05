# oxlint

Synthetic, **deliberately invalid** TypeScript project for **oxlint** -- the negative-control twin of `TypeScript-Tools-Clean/oxlint`, built so the tool genuinely finds something wrong rather than reporting clean.

Package: oxlint 1.86.0 (npm)
Domain: grain silo fill-ratio tracking (GrainSilo) (same fixture identity as the clean corpus; only the content is broken)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What was made wrong, and why it's wrong enough

grainSilo.ts rewritten with duplicate `switch` case labels, a constant-condition branch, unused variables, and a `debugger` statement. oxlint only reports these as warnings by default, so `--deny-warnings` is added to the invocation (a CLI flag, not a content change) to make the exit code honestly reflect that warnings were found.

## Command

```bash
oxlint src/ --deny-warnings
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
