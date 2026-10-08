# Bearer CLI

Synthetic, clean-by-design TypeScript project for **Bearer CLI**.

Package: bearer/bearer 2.1.1 (Go binary / GitHub release)

Domain: patient intake form handling (IntakeForm)

**Not installed here**: see Notes for why, and what was checked instead.

## What a passing result looks like

A Bearer scan of IntakeForm would report zero sensitive-data-flow findings -- raw notes are redacted to a length-only summary before storage and nothing is logged.

## Command

```bash
bearer scan .
```

## Notes

Bearer's SAST / data-flow scanner ships as a GitHub release binary (v2.1.1: `bearer_2.1.1_linux_amd64.tar.gz`); the npm package literally named `bearer` is an unrelated HTTP auth-header micro-library. Correction to the earlier note: the release download itself works (HTTP 200 on 2026-10-07); what failed in the generating session is Bearer's first-run download of its default rules (`0 rules found for supported language, default rules could not be downloaded` -- bearer-rules returned 403), so the scan could not complete there. The Clean folder is therefore **expected** clean and not measured.
