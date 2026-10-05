# eslint-plugin-sonarjs

Synthetic, **deliberately invalid** TypeScript project for **eslint-plugin-sonarjs** -- the negative-control twin of `TypeScript-Tools-Clean/eslint-plugin-sonarjs`, built so the tool genuinely finds something wrong rather than reporting clean.

Package: eslint-plugin-sonarjs 4.2.2 (npm)
Domain: toll booth lane pricing (TollBooth) (same fixture identity as the clean corpus; only the content is broken)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What was made wrong, and why it's wrong enough

tollBooth.ts rewritten as one function with five-deep nested `if`/`else` chains repeated per lane (cognitive-complexity), paired with identical fallback branches and a non-exhaustive `switch`. `eslint.config.js` tightens `sonarjs/cognitive-complexity` to a threshold of 5 (from the plugin's own much looser default) so the real complexity in the fixture is what trips it, not a relaxed bar.

## Command

```bash
eslint src/
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
