# cdxgen

Synthetic, **deliberately invalid** TypeScript project for **cdxgen** -- the negative-control twin of `TypeScript-Tools-Clean/cdxgen`, built so the tool genuinely finds something wrong rather than reporting clean.

Package: @cyclonedx/cdxgen 12.8.5 (npm)
Domain: cannery production line dependency ledger (CanneryLine) (same fixture identity as the clean corpus; only the content is broken)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What was made wrong, and why it's wrong enough

Same four `file:./vendor/*` dependencies as license-checker-rseidelsohn (canneryLine.ts genuinely imports and calls all four). cdxgen itself only generates an SBOM and always exits 0, so `tools/checkBom.js` reads the generated bom.json back, narrows it to this project's own declared `dependencies` (cdxgen also enumerates its own tool-internal devDependency tree as components, which says nothing about this fixture), and fails when the disallowed-license share of those is >= 50%. Measured: 75% (3 of 4).

## Command

```bash
cdxgen -t js -o bom.json . && node tools/checkBom.js
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
