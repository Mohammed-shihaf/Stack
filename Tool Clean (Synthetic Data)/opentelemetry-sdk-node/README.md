# opentelemetry-sdk-node

Synthetic, clean-by-design TypeScript project for **opentelemetry-sdk-node**.

Package: @opentelemetry/sdk-node 0.222.0 + sdk-trace-node 2.11.0 + api 1.9.1 (npm)

Domain: lighthouse relay message tracing (LighthouseRelay)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

A real `NodeTracerProvider` wired to an in-memory exporter confirms `relayMessage()` emits exactly one span with the expected name and attributes -- a real span, not an assumed one.

## Command

```bash
node build/tools/driver.js
```

## Notes

The project's own typescript-version-metric-matrix.md flags a real defect elsewhere in this family: an SDK wired up but never actually imported/used produces a structurally-zero span count while still exiting 0. This folder's driver asserts the span count and its attributes explicitly so that failure mode can't hide here.

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary -- a family is marked NOT INSTALLED / CODE-ONLY only where a real, reproducible absence was confirmed live (never assumed from a package's declared `engines` field alone).

| Family | Status |
| --- | --- |
| node12 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node14 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node20 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node24 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node26 | CLEAN (installed/built and run for real under this family's own Node binary) |
