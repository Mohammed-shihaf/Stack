# Grype

Synthetic, clean-by-design TypeScript project for **Grype**.

Package: Grype -- github.com/anchore/grype (Go binary / GitHub release)

Domain: ship chandlery stock pins (ChandleryStock)

**Not installed here**: see Notes for why, and what was checked instead.

## What a passing result looks like

`sbom.cdx.json` lists typescript 5.9.3 and @types/node 26.6.3 only; a scan of it would report zero known-vulnerable packages.

## Command

```bash
grype sbom:./sbom.cdx.json
```

## Notes

Grype scans an SBOM document with `grype sbom:<file>` (its README: "Scan an SBOM for even faster vulnerability detection: grype sbom:./sbom.json"; the provider decodes through Syft's multi-format `syft/format` package, which includes CycloneDX). The Grype release was not obtainable in the generating session (`github.com/anchore/grype/releases/latest` returned 403), so Grype itself was not run. The folder has **no lockfile** on purpose: a `package-lock.json` in a sub-folder makes Testable treat the folder as its own project (one extra task per tool), so the dependency inventory is supplied as a CycloneDX 1.5 SBOM instead.
