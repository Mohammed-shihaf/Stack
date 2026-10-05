# fast-check

Synthetic, **deliberately invalid** TypeScript project for **fast-check** -- the negative-control twin of `TypeScript-Tools-Clean/fast-check`, built so the tool genuinely finds something wrong rather than reporting clean.

Package: fast-check 4.10.2 (npm)
Domain: brewery kettle unit conversion (brewKettle) (same fixture identity as the clean corpus; only the content is broken)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What was made wrong, and why it's wrong enough

brewKettle.ts's litresToGallons divides by 4 instead of 3.785411784 (breaking the round-trip property for virtually every random input) and blendTemperatureCelsius was rewritten as an unweighted average with an arbitrary +/-5 skew (breaking the within-bounds property whenever the two volumes differ, which is almost always). fast-check's own property runner (100 random cases per property by default) fails both properties on the overwhelming majority of its generated inputs.

## Command

```bash
vitest run
```

## Note

node14's pinned vitest/vite drags in a bundled `vite/dist/node/runtime.js` that uses `||=` (added in V8 8.5 / Node 15) -- Node 14's own native ESM loader cannot even parse that file, so the process crashes before any test runs. Node 14 also does not fail the process on an unhandled promise rejection by default (that only became the default in Node 15+), so without `NODE_OPTIONS=--unhandled-rejections=strict` this crash is silently swallowed as exit code 0 -- confirmed to affect `TypeScript-Tools-Clean`'s own node14 cell identically (same crash signature in its `live_results.json`, also reported exit 0 and marked CLEAN there, which is a latent false-negative in that corpus, not a real pass). This corpus's verification sets that one environment flag so a crash is honestly reported as non-zero; it does not change whether the crash happens, only whether Node admits it.

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary, using the identical package-version pins as `TypeScript-Tools-Clean` (only the fixture content differs) -- a family is marked NOT INSTALLED / CODE-ONLY only where the same genuine, reproducible absence already documented in the clean corpus recurs here.

| Family | Status |
| --- | --- |
| node12 | NOT INSTALLED / CODE-ONLY -- vitest unresolvable for this family (same pin-table gap as the clean corpus). |
| node14 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
| node20 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
| node24 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
| node26 | FINDING (measured, real invocation; exit rc=1 -- see this tool's defect note above for the measured percentage) |
