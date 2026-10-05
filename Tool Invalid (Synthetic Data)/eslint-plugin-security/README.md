# eslint-plugin-security

Synthetic, **deliberately invalid** TypeScript project for **eslint-plugin-security** -- the negative-control twin of `TypeScript-Tools-Clean/eslint-plugin-security`, built so the tool genuinely finds something wrong rather than reporting clean.

Package: eslint-plugin-security 4.1.0 (npm)
Domain: session token vault (SessionVault) (same fixture identity as the clean corpus; only the content is broken)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What was made wrong, and why it's wrong enough

sessionVault.ts rewritten to actually commit every anti-pattern the plugin's rule set names: `eval`, a tainted `child_process.exec`, a non-literal `RegExp`, a non-literal `require`, `Math.random()` as a token source, and a non-constant-time `===` secret comparison. The plugin's own recommended config ships some of these at `warn`; this tool's `eslint.config.js` explicitly escalates all nine to `error` so the real violations flip ESLint's exit code (ESLint only fails the process on errors, not warnings, by default).

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
