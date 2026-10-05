# opentelemetry-sdk-node

Synthetic, **deliberately invalid** TypeScript project for **opentelemetry-sdk-node** -- the negative-control twin of `TypeScript-Tools-Clean/opentelemetry-sdk-node`, built so the tool genuinely finds something wrong rather than reporting clean.

Package: @opentelemetry/sdk-node 0.222.0 + sdk-trace-node 2.11.0 + api 1.9.1 (npm)
Domain: lighthouse relay message tracing (LighthouseRelay) (same fixture identity as the clean corpus; only the content is broken)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What was made wrong, and why it's wrong enough

lighthouseRelay.ts's relayMessage() now starts spans manually (tracer.startSpan, not startActiveSpan) and only calls span.end() for a `priority` relay. opentelemetry-sdk-node has no inherent pass/fail percentage of its own, so tools/driver.ts (per family, legacy/modern SDK-API variants matching the clean corpus's own split) drives a realistic batch of 10 relays (1 priority, 9 ordinary) through a real NodeTracerProvider + in-memory exporter and measures the real closed-vs-opened span ratio. Measured: 10.0% (1 of 10 spans ever closed/exported) -- the great majority of opened spans leak.

## Command

```bash
node build/tools/driver.js
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
