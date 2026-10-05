# vitest

Synthetic, clean-by-design TypeScript project for **vitest**.

Package: vitest 5.0.2 (npm)

Domain: tidepool water-quality log (TidepoolLog)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

`vitest run` passes all tests against TidepoolLog with zero failures.

## Command

```bash
vitest run
```

## Notes

The one folder in the corpus that keeps vitest at its current latest (5.0.2) rather than 4.1.11 -- it needs nothing from the Stryker/oxc-coverage-instrument ecosystem that pinned that version back, so it exercises vitest itself at the version everything else in this corpus had to work around.

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary -- a family is marked NOT INSTALLED / CODE-ONLY only where a real, reproducible absence was confirmed live (never assumed from a package's declared `engines` field alone).

| Family | Status |
| --- | --- |
| node12 | NOT INSTALLED / CODE-ONLY -- vitest itself has no genuine Node 12 release (its earliest pre-`engines` versions are non-functional day-one previews, not real releases). |
| node14 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node20 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node24 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node26 | CLEAN (installed/built and run for real under this family's own Node binary) |
