# OSV-Scanner

Synthetic, clean-by-design TypeScript project for **OSV-Scanner**.

Package: OSV-Scanner 2.6.0 -- github.com/google/osv-scanner (Go binary / GitHub release)

Domain: cordwood stack inventory (CordwoodStack)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

`sbom.cdx.json` lists typescript 5.9.3 and @types/node 26.6.3 only; a scan of it would report zero known-vulnerable packages.

## Command

```bash
osv-scanner scan source -L sbom.cdx.json      # or:  osv-scanner scan source .   (auto-detects *.cdx.json)
```

## Notes

OSV-Scanner 2.6.0 reads CycloneDX SBOMs (file name `*.cdx.json`). Measured 2026-10-07 with the real v2.6.0 binary: `osv-scanner scan source -S sbom.cdx.json` printed `Scanned .../sbom.cdx.json file and found 2 packages` for the Clean file and `... found 7 packages` for the Invalid file; the vulnerability lookup that follows (`POST https://api.osv.dev/v1/querybatch`) returned 403 in that session, so no advisory count is quoted. The folder has **no lockfile** on purpose: a `package-lock.json` in a sub-folder makes Testable treat the folder as its own project (one extra task per tool), so the dependency inventory is supplied as a CycloneDX 1.5 SBOM instead.
