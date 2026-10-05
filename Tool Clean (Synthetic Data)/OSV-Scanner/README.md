# OSV-Scanner

Synthetic, clean-by-design TypeScript project for **OSV-Scanner**.

Package: github.com/google/osv-scanner (Go binary / GitHub release)

Domain: cordwood stack inventory (CordwoodStack)

**Not installed here**: see Notes for why, and what was checked instead.

## What a passing result looks like

An OSV-Scanner run against CordwoodStack's lockfile would report zero known-vulnerable packages.

## Command

```bash
osv-scanner --lockfile package-lock.json
```

## Notes

Same shape of blocker as Grype: GitHub Releases return 403 here and `go install github.com/google/osv-scanner/cmd/osv-scanner@latest` is refused by the same golang proxy allowlist. No apt package exists.
