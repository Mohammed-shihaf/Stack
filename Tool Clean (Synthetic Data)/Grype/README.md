# Grype

Synthetic, clean-by-design TypeScript project for **Grype**.

Package: github.com/anchore/grype (Go binary / GitHub release)

Domain: ship chandlery stock pins (ChandleryStock)

**Not installed here**: see Notes for why, and what was checked instead.

## What a passing result looks like

A Grype SBOM scan of ChandleryStock's pinned dependencies would report zero known-vulnerable packages.

## Command

```bash
grype dir:. -o table
```

## Notes

Grype ships only as a GitHub Release binary or via `go install`; both are blocked here (GitHub Releases: 403 at the egress proxy; `go install github.com/anchore/grype@latest`: "Host not in allowlist: proxy.golang.org", measured directly). No apt package exists. Same finding as the sibling Java corpus.
