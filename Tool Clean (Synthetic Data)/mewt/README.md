# mewt

Synthetic, clean-by-design TypeScript project for **mewt**.

Package: mewt 4.0.0 (crates.io, built from source)

Domain: forge quench temper grading (ForgeTemper)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

mewt's real mutation campaign against ForgeTemper (comprehensive mode) catches all 30 generated mutants -- zero survive.

## Command

```bash
mewt run src --comprehensive
```

## Notes

Not on npm under this name (the npm package `mewt` is an unrelated immutability micro-library); the real tool is a Rust mutation-testing framework, confirmed by `cargo search` ("Mutation testing framework with multi-language support") and matching the harvested folder's own per-language fixture layout (cpp/daml/go/javascript/...). Built from crates.io. Runs the project's real vitest suite as its test command.

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary -- a family is marked NOT INSTALLED / CODE-ONLY only where a real, reproducible absence was confirmed live (never assumed from a package's declared `engines` field alone).

| Family | Status |
| --- | --- |
| node12 | NOT INSTALLED / CODE-ONLY -- mewt's own mutation run shells out to `npx vitest run` as its configured test command; vitest has no genuine Node 12 release. |
| node14 | NOT INSTALLED / CODE-ONLY -- mewt's own mutation run shells out to `npx vitest run`; vitest 0.34.6 (node14's own ceiling) predates the coverage/runner package lineage mewt's own harness assumes. |
| node20 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node24 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node26 | CLEAN (installed/built and run for real under this family's own Node binary) |
