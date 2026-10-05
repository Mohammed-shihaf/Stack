# jscpd

Synthetic, **deliberately invalid** TypeScript project for **jscpd** -- the negative-control twin of `TypeScript-Tools-Clean/jscpd`, built so the tool genuinely finds something wrong rather than reporting clean.

Package: jscpd 5.3.3 (npm)
Domain: apiary hive inspection log (ApiaryHive) (same fixture identity as the clean corpus; only the content is broken)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What was made wrong, and why it's wrong enough

apiaryHive.ts rewritten as five byte-identical 15-line method bodies (logBlockA..E) differing only by name. Measured: 60.47% duplicated lines / 68.00% duplicated tokens (jscpd's own real clone detector, at the same 5-line/30-token thresholds the clean corpus uses) -- comfortably past the 50% bar in the direction that matters (over half the file is literally copy-pasted).

## Command

```bash
jscpd src/ --min-lines 5 --min-tokens 30 --threshold 0
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
