# reson

Synthetic, clean-by-design TypeScript project for **reson**.

Package: reson (Rust, github.com/nexepic/reson, built from the v1.4.1 tag with `cargo install --git ... --tag v1.4.1 --locked`)

Domain: harbour tide-gauge readings (TideGauge)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

reson reports `duplicateBlocks: 0`, `duplicateFiles: 0`, `duplicateLines: 0` -- the five functions in `src/tideGauge.ts` are structurally different (reduce, counting loop, Math.max/min, map/join, split/validate).

## Command

```bash
reson --source-path src --output-format json --output-file reports/reson.json --threshold 10 --min-ast-nodes 12
```

## Notes

reson is an AST-level duplicate-code detector written in Rust; it has no npm package, so the folder is Node-version-independent. Built from the `v1.4.1` tag; the binary reports itself as `reson v1.3.3` because upstream did not bump the version in `Cargo.toml` for that tag (`cargo install` printed `reson v1.3.3 (https://github.com/nexepic/reson?tag=v1.4.1#83aad4e4)`). The thresholds are the ones the `Tool Triggering (Synthetic Data)/reson` runner uses. Measured 2026-10-07.
