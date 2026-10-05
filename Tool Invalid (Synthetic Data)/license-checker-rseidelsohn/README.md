# license-checker-rseidelsohn

Synthetic, **deliberately invalid** TypeScript project for **license-checker-rseidelsohn** -- the negative-control twin of `TypeScript-Tools-Clean/license-checker-rseidelsohn`, built so the tool genuinely finds something wrong rather than reporting clean.

Package: license-checker-rseidelsohn 5.0.1 (npm)
Domain: tannery hide-batch ledger (TanneryLedger) (same fixture identity as the clean corpus; only the content is broken)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What was made wrong, and why it's wrong enough

package.json grew four real, installable `file:./vendor/*` production dependencies: one GPL-3.0-only, one with no license field at all, one MPL-2.0, and one MIT (the control). tanneryLedger.ts genuinely imports and calls all four. 3 of 4 (75%) carry a license outside the `--onlyAllow` allow-list.

## Command

```bash
license-checker-rseidelsohn --production --onlyAllow "MIT;ISC;BSD-2-Clause;BSD-3-Clause;Apache-2.0;0BSD" --excludePrivatePackages
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
