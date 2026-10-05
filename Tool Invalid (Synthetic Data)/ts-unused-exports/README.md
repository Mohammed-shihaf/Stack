# ts-unused-exports

Synthetic, **deliberately invalid** TypeScript project for **ts-unused-exports** -- the negative-control twin of `TypeScript-Tools-Clean/ts-unused-exports`, built so the tool genuinely finds something wrong rather than reporting clean.

Package: ts-unused-exports 11.0.1 (npm)
Domain: harbor tariff calculation (HarborTariff) (same fixture identity as the clean corpus; only the content is broken)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What was made wrong, and why it's wrong enough

harborTariff.ts grew a second, parallel surface (PilotageRequest, pilotageFeeCents, TugDispatch, DEFAULT_PILOTAGE) that src/index.ts never imports. 4 of the file's 6 exports are genuinely unreachable.

## Command

```bash
ts-unused-exports tsconfig.json
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
