# ORT

Synthetic, clean-by-design TypeScript project for **ORT**.

Package: OSS Review Toolkit (ORT) -- github.com/oss-review-toolkit/ort (Kotlin, GitHub release / Docker image)

Domain: software licence ledger (LicenceLedger)

**Not installed here**: see Notes for why, and what was checked instead.

## What a passing result looks like

Every declared dependency carries a permissive licence: `zod` 4.6.5 (MIT), `typescript` 5.9.3 (Apache-2.0) and `@types/node` 26.6.3 (MIT). An ORT analysis + evaluation against a permissive-only policy would report no violation.

## Command

```bash
ort analyze -i . -o ort-out -P ort.analyzer.allowDynamicVersions=true
```

## Notes

ORT's Analyzer reads `package.json`. The folder deliberately has **no lockfile** (a `package-lock.json` in a sub-folder makes Testable treat the folder as its own project), so the analyzer has to resolve versions dynamically: `AnalyzerConfiguration(allowDynamicVersions = true)`, the option ORT's own Node plugin tests use (`NpmTest.kt`). Not executed in the generating session -- ORT is a JVM application distributed as a release archive / container image and was not installed there; the licence of each pin was read from the npm registry on 2026-10-07 instead (`npm view <package>@<version> license`).
