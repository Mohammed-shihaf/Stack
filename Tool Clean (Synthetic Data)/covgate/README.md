# covgate

Synthetic, clean-by-design TypeScript project for **covgate**.

Package: covgate 0.2.0 (crates.io, built from source)

Domain: smokehouse batch timing (SmokehouseBatch)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

covgate's diff-focused gate against the `feature` branch's real vitest v8/Istanbul coverage report passes all three configured gates (lines, branches, functions) at 100%.

## Command

```bash
covgate check coverage/coverage-final.json --base main
```

## Notes

Not on npm under this name (the folder's own fixtures explicitly target Vitest's Istanbul-format v8 coverage JSON, matching `covgate`'s real crates.io description, "diff-focused coverage gates for local CI, pull requests, and autonomous coding agents"); built from source via `cargo install covgate` against crates.io, which is reachable here. Uses a real `main`/`feature` git history, same convention as the corpus's diff-cover folder.

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary -- a family is marked NOT INSTALLED / CODE-ONLY only where a real, reproducible absence was confirmed live (never assumed from a package's declared `engines` field alone).

| Family | Status |
| --- | --- |
| node12 | NOT INSTALLED / CODE-ONLY -- covgate's own gate reads a real vitest v8 coverage report; vitest has no genuine Node 12 release. |
| node14 | NOT INSTALLED / CODE-ONLY -- covgate's own gate reads a real vitest v8 coverage report; vitest 0.34.6 (node14's own ceiling) predates the @vitest/coverage-v8 companion package. |
| node20 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node24 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node26 | CLEAN (installed/built and run for real under this family's own Node binary) |
