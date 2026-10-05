# knip

Synthetic, **deliberately invalid** TypeScript project for **knip** -- the negative-control twin of `TypeScript-Tools-Clean/knip`, built so the tool genuinely finds something wrong rather than reporting clean.

Package: knip 6.38.0 (npm)
Domain: canal lockkeeper pass log (LockkeeperLog) (same fixture identity as the clean corpus; only the content is broken)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What was made wrong, and why it's wrong enough

lockkeeperLog.ts grew a second, parallel surface (GateSchedule, isGateOpen, describeGate, SilentBasinLedger, DEFAULT_GATE_SCHEDULE) that src/index.ts -- knip's only entry point -- never imports. 5 of the file's 7 exports are genuinely unreachable from the entry point.

## Command

```bash
knip
```

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary, using the identical package-version pins as `TypeScript-Tools-Clean` (only the fixture content differs) -- a family is marked NOT INSTALLED / CODE-ONLY only where the same genuine, reproducible absence already documented in the clean corpus recurs here.

| Family | Status |
| --- | --- |
| node12 | NOT INSTALLED / CODE-ONLY -- knip unresolvable for this family (same pin-table gap as the clean corpus). |
| node14 | NOT INSTALLED / CODE-ONLY -- knip unresolvable for this family (same pin-table gap as the clean corpus). |
| node20 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
| node24 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
| node26 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
