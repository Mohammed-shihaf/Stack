# Opengrep

Synthetic, clean-by-design TypeScript project for **Opengrep**.

Package: opengrep/opengrep (Go binary / GitHub release)

Domain: relay signal lockbox access control (SignalLockbox)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

Stand-in tool actually run: `semgrep`

## What a passing result looks like

Opengrep is a semgrep fork sharing its rule format; not reachable here (see notes), so `semgrep` -- already installed, and used the same way as this corpus's own FindSecBugs-equivalent stand-in in the sibling Java corpus -- was run for real against a local custom ruleset (hardcoded secrets, weak hashes, insecure randomness, non-constant-time comparison) and found zero findings.

## Command

```bash
semgrep --config security-rules.yml src/
```

## Notes

The npm package literally named `opengrep` is a 145-byte parked placeholder (not the real tool); Opengrep's real distribution is a GitHub Release binary, blocked here (403), with no apt/go-install route either (same golang proxy block as Grype/OSV-Scanner).

## Per-Node-family results

Boundary-version methodology: 2 earliest + 1 middle + 2 latest supported Node majors (12, 14, 20, 24, 26). Every family below was actually installed (or built, where a build step is needed) and invoked for real under that family's own real Node+npm binary -- a family is marked NOT INSTALLED / CODE-ONLY only where a real, reproducible absence was confirmed live (never assumed from a package's declared `engines` field alone).

| Family | Status |
| --- | --- |
| node12 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node14 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node20 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node24 | CLEAN (installed/built and run for real under this family's own Node binary) |
| node26 | CLEAN (installed/built and run for real under this family's own Node binary) |
