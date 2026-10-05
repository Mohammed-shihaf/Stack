# debtmap

Synthetic, **deliberately invalid** TypeScript project for **debtmap** -- the negative-control twin of `TypeScript-Tools-Clean/debtmap`, built so the tool genuinely finds something wrong rather than reporting clean.

Package: debtmap 0.24.1 (crates.io, built from source)
Domain: windmill gear ratio calculation (windmillGears) (same fixture identity as the clean corpus; only the content is broken)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What was made wrong, and why it's wrong enough

windmillGears.ts's four functions were rewritten with 4-5-level nested conditionals, a `for` loop with an inner `switch`, and a `try`/`catch`/`finally`, each individually pushing cyclomatic complexity into the teens. debtmap's own JSON report (`--format json --min-score 0`, read back by check_debt.py since the bare CLI always exits 0) flags all 4 of 4 functions (100%) as technical debt.

## Command

```bash
debtmap analyze src --languages typescript && python3 check_debt.py
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
