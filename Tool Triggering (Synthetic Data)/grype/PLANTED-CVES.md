# Planted vulnerable pins

Five dependencies are pinned to versions with published advisories. They are
**deliberate**, identical across all five branches, and are the input for the
supply-chain tool family: npm audit, GitHub Security Advisories (Dependabot),
Grype, and the cdxgen SBOM that feeds both Grype and the ORT license proxy.

| Package | Pinned | Class of advisory |
|---|---|---|
| `lodash` | 4.17.15 | prototype pollution |
| `minimist` | 1.2.5 | prototype pollution |
| `axios` | 0.21.0 | server-side request forgery |
| `node-fetch` | 2.6.0 | information exposure via redirect |
| `tar` | 6.1.0 | arbitrary file write / path traversal |

Rules for this file, carried over from the Python family:

- The audit runner reads **this table** for the expected set. It never carries a
  hard-coded list, because the Python build proved that a hard-coded expectation
  silently drifts from the manifest.
- Advisory counts are **not** recorded here. They change as new advisories are
  published, and a stale count committed to the repository would be a false
  expectation. The gate is "at least one advisory per planted pin", verified at
  run time.
- These pins are never upgraded. `ncu` will report them as outdated; that is the
  point.
