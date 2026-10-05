# Bearer CLI

Synthetic, clean-by-design TypeScript project for **Bearer CLI**.

Package: bearer/bearer (Go binary / GitHub release)

Domain: patient intake form handling (IntakeForm)

**Not installed here**: see Notes for why, and what was checked instead.

## What a passing result looks like

A Bearer scan of IntakeForm would report zero sensitive-data-flow findings -- raw notes are redacted to a length-only summary before storage and nothing is logged.

## Command

```bash
bearer scan .
```

## Notes

Bearer's real SAST/data-flow scanner ships only as a GitHub Release binary (curl-install script or Docker image); GitHub Releases return 403 here. The npm package literally named `bearer` is an unrelated HTTP auth-header micro-library (`bearer` @ 0.0.20, "Bearer authentication module using token and Authorization HTTP header") and was not substituted for it.
