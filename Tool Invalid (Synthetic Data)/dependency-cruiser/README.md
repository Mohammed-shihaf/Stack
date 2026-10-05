# dependency-cruiser

Synthetic, **deliberately invalid** TypeScript project for **dependency-cruiser** -- the negative-control twin of `TypeScript-Tools-Clean/dependency-cruiser`, built so the tool genuinely finds something wrong rather than reporting clean.

Package: dependency-cruiser 18.4.0 (npm)
Domain: spice market pricing ledger (SpiceMarketLedger) (same fixture identity as the clean corpus; only the content is broken)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What was made wrong, and why it's wrong enough

ledger.ts and pricing.ts now import each other (a real circular dependency), and two new standalone files (warehouseStub.ts, auditStub.ts) import nothing and are imported by nothing (true graph orphans). 4 of the project's 5 source files trip `no-circular` or `no-orphans`.

## Command

```bash
depcruise src --config .dependency-cruiser.cjs --output-type err
```

## Note

node12's pinned dependency-cruiser 11.18.0 does not expand a bare directory argument into its `.ts` files (confirmed live: `depcruise src ...` silently reports "0 modules, 0 dependencies cruised" -- a false CLEAN, not a real scan, and a latent gap in the clean corpus's own node12 cell, which used the identical invocation). This family's command is `depcruise "src/**/*.ts" --config .dependency-cruiser.cjs --ts-config tsconfig.json --output-type err` instead -- an explicit glob and `--ts-config`, not a relaxed rule set.

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary, using the identical package-version pins as `TypeScript-Tools-Clean` (only the fixture content differs) -- a family is marked NOT INSTALLED / CODE-ONLY only where the same genuine, reproducible absence already documented in the clean corpus recurs here.

| Family | Status |
| --- | --- |
| node12 | FINDING (measured, real invocation; exit rc=2 -- see this tool's defect note above for the measured percentage) |
| node14 | FINDING (measured, real invocation; exit rc=3 -- see this tool's defect note above for the measured percentage) |
| node20 | FINDING (measured, real invocation; exit rc=3 -- see this tool's defect note above for the measured percentage) |
| node24 | FINDING (measured, real invocation; exit rc=3 -- see this tool's defect note above for the measured percentage) |
| node26 | FINDING (measured, real invocation; exit rc=3 -- see this tool's defect note above for the measured percentage) |
