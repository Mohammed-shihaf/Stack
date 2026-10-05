# mewt

Synthetic, **deliberately invalid** TypeScript project for **mewt** -- the negative-control twin of `TypeScript-Tools-Clean/mewt`, built so the tool genuinely finds something wrong rather than reporting clean.

Package: mewt 4.0.0 (crates.io, built from source)
Domain: forge quench temper grading (ForgeTemper) (same fixture identity as the clean corpus; only the content is broken)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What was made wrong, and why it's wrong enough

forgeTemper.test.ts was gutted to a single assertion far from any boundary (classifyTemper(90) only) -- quenchSeconds is never tested and classifyTemper's two real thresholds (35, 55) are never approached. `mewt run` always exits 0 once its campaign completes, so `check_mutation.py` reads the campaign's own `mewt status --format json` summary and fails when the real mutation score (caught/total) is under 50%. Measured: 23.3% (7 of 30 mutants caught).

## Command

```bash
mewt run src --comprehensive; python3 check_mutation.py
```

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary, using the identical package-version pins as `TypeScript-Tools-Clean` (only the fixture content differs) -- a family is marked NOT INSTALLED / CODE-ONLY only where the same genuine, reproducible absence already documented in the clean corpus recurs here.

| Family | Status |
| --- | --- |
| node12 | NOT INSTALLED / CODE-ONLY -- vitest unresolvable for this family (same pin-table gap as the clean corpus). |
| node14 | NOT INSTALLED / CODE-ONLY -- vitest unresolvable for this family (same pin-table gap as the clean corpus). |
| node20 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
| node24 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
| node26 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
