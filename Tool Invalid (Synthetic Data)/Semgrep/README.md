# Semgrep

Boundary-version matrix for **Semgrep** -- the deliberate inverse of
`Python-Tools-Clean`'s `Semgrep` folder. Same methodology (2 earliest
supported versions, 1 middle, 2 end/latest), same five-version layout, but
every fixture here was engineered so Semgrep genuinely finds something, not
nothing.

| Version | Status |
|---|---|
| py3.6 | CODE-ONLY (not run against a live interpreter) |
| py3.7 | CODE-ONLY (not run against a live interpreter) |
| py3.11 | MEASURED FINDING |
| py3.13 | MEASURED FINDING |
| py3.14 | MEASURED FINDING |

3.6 and 3.7 are code-only (see their own READMEs). 3.11, 3.13 and 3.14 were
each measured for real: semgrep 1.178.0 actually invoked against the actual
source, under that version's own real interpreter, with the same committed
`semgrep-rules.yml` the clean corpus ships (copied byte-for-byte).

## Measured result (identical at 3.11, 3.13 and 3.14)

```
semgrep --config=semgrep-rules.yml --error --quiet src/
```

**10 of 10 rule IDs genuinely fire (100%)**, every one a real match, not a
forced one: `no-eval-or-exec`, `no-os-command`, `no-unsafe-deserialisation`,
`no-weak-hash`, `no-insecure-temp-file`, `no-format-string-template-injection`,
`no-string-built-sql`, `no-request-without-timeout`, `no-assert-in-source`,
`no-hardcoded-secret`. Exit code 1 (`--error`). Well over the 50% bar on
distinct rule IDs fired.

**Note on py3.14:** the sibling clean corpus recorded semgrep 1.178.0
crashing at import time under Python 3.14.0rc2 (a pydantic/typing
incompatibility). That crash was **not reproduced in this build
environment** -- semgrep ran cleanly here under 3.14.0rc2 and found all 10
rule IDs, identical to 3.11 and 3.13. Documented as measured, not assumed
from the other corpus's notes.

See each `py3.X/README.md` for that version's own notes.
