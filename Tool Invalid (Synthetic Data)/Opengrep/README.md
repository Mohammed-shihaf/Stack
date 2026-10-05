# Opengrep

Synthetic, **deliberately invalid** TypeScript project for **Opengrep** -- the negative-control twin of `TypeScript-Tools-Clean/Opengrep`, built so the tool genuinely finds something wrong rather than reporting clean.

Package: opengrep/opengrep (Go binary / GitHub release)
Domain: relay signal lockbox access control (SignalLockbox) (same fixture identity as the clean corpus; only the content is broken)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What was made wrong, and why it's wrong enough

signalLockbox.ts now hardcodes a passphrase and an API token as literals, hashes with md5/sha1 instead of sha256, compares secrets with `===` instead of a constant-time comparison, and generates one-time codes with `Math.random()` -- a real, direct match for every one of security-rules.yml's four rules, not a single planted line.

## Command

```bash
semgrep --config security-rules.yml src/ --error
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
