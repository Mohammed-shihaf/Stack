# Opengrep

Boundary-version matrix for **Opengrep** -- the deliberate inverse of
`Python-Tools-Clean`'s `Opengrep` folder. Same methodology, same five-version
layout. Opengrep is a standalone binary and, exactly as in the clean corpus,
its release host is refused at this environment's egress proxy: **NOT
INSTALLED at every version**, carried forward unchanged.

| Version | Status |
|---|---|
| py3.6 | CODE-ONLY (not run against a live interpreter) |
| py3.7 | CODE-ONLY (not run against a live interpreter) |
| py3.11 | NOT INSTALLED |
| py3.13 | NOT INSTALLED |
| py3.14 | NOT INSTALLED |

Same binary-egress block as the clean corpus's own Opengrep folder -- this
corpus changed fixture content, not toolchain availability. Opengrep is the
Semgrep fork and shares the rule format, so (mirroring the clean corpus's own
cross-reference) **Semgrep stands in as the live-measured evidence**: it was
actually run against this folder's exact ruleset and found a real,
non-trivial result.

## Stand-in result (Semgrep, identical at 3.11/3.13/3.14)

```
semgrep --config=semgrep-rules.yml --error --quiet src/
```

**10 of 10 rule IDs genuinely fire (100%)** -- the same ruleset, the same
rule family Opengrep would evaluate. See `Semgrep/py3.11/README.md` for the
full transcript on the sibling folder; this folder's own source reproduces
the identical shape (same functions, same sinks) under its own domain so the
Opengrep folder isn't just a copy of the Semgrep folder's findings by name
only -- it was independently run.

Re-run the real `opengrep` binary before treating this folder as proven: a
stand-in is evidence, not proof -- the same caveat the clean corpus states
for its own (negative) Opengrep result.
