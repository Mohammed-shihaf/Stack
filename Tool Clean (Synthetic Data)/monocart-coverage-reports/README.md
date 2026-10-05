# monocart-coverage-reports

Synthetic, clean-by-design TypeScript project for **monocart-coverage-reports**.

Package: monocart-coverage-reports 2.13.0 (npm)

Domain: quarry crane lift capacity (QuarryCrane)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

`mcr` reports 100% line/statement/function/branch V8 coverage for QuarryCrane's own source, scoped away from its own tooling via `--filter`.

## Command

```bash
mcr --filter "**/build/src/**" node build/tools/driver.js -r v8,json-summary -o coverage-report
```

## Notes

The companion `vitest-monocart-coverage` adapter pins `@vitest/coverage-v8` to `^4.1.2`, which conflicts with this sandbox's current vitest (5.0.2) and crashed npm's own arborist resolver -- so this folder drives monocart-coverage-reports directly with its own `mcr` CLI wrapping a plain Node driver script, exactly as its own documentation shows for non-test-framework use, rather than forcing the vitest integration.

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary -- a family is marked NOT INSTALLED / CODE-ONLY only where a real, reproducible absence was confirmed live (never assumed from a package's declared `engines` field alone).

| Family | Status |
| --- | --- |
| node12 | NOT INSTALLED / CODE-ONLY -- No release threads both needles: every version old enough to avoid the current `commander@^14` hard dependency also ships no `mcr` CLI at all, and every version that does ship `mcr` (2.2.0 onward) loads a bundled vendor file that itself throws a syntax error under Node 12's V8. |
| node14 | NOT INSTALLED / CODE-ONLY -- Same bundled-vendor-file incompatibility as node12, confirmed live independently under Node 14's own (newer, but still insufficient) V8. |
| node20 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node24 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node26 | CLEAN (installed/built and run for real under this family's own Node binary) |
