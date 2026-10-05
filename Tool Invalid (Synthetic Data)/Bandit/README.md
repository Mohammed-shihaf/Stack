# Bandit

Boundary-version matrix for **Bandit** -- the deliberate inverse of
`Python-Tools-Clean`'s `Bandit` folder. Same methodology (2 earliest
supported versions, 1 middle, 2 end/latest), same five-version layout, but
every fixture here was engineered so Bandit genuinely finds something, not
nothing.

| Version | Status |
|---|---|
| py3.6 | CODE-ONLY (not run against a live interpreter) |
| py3.7 | CODE-ONLY (not run against a live interpreter) |
| py3.11 | MEASURED FINDING |
| py3.13 | MEASURED FINDING |
| py3.14 | MEASURED FINDING |

3.6 and 3.7 are code-only: no interpreter that old exists in this build
environment, so the source is verified by `ast.parse(..., feature_version=...)`
and by the folder's own pytest suite passing unmodified under an available
interpreter. 3.11, 3.13 and 3.14 were each measured for real: bandit 1.9.4
actually invoked against the actual source, under that version's own real
interpreter.

## Measured result (identical at 3.11, 3.13 and 3.14)

```
bandit -r src/ -f screen
```

**7 real issues** (3 Low, 2 Medium, 2 High), none suppressed with `# nosec`.
**4 of the package's 6 functions (66.7%)** each trigger at least one genuine
per-function Bandit finding -- `hash_employee_pin` (B324, weak MD5),
`sync_schedule` (B602, `shell=True`), `load_cached_roster` (B301, unsafe
pickle), `scratch_path` (B306, insecure `tempfile.mktemp`) -- comfortably
over the 50% bar. Two more real issues sit outside the function tally: a
hardcoded credential (B105) on a module-level constant, and the two
import-level blacklist notes (B403 for `pickle`, B404 for `subprocess`) that
Bandit raises wherever those modules are imported at all. `total_hours` and
`format_shift_label` are the two functions left clean, so the result is
majority-wrong, not unanimously wrong -- the same falsifiable, partial
failure shape asked for.

See each `py3.X/README.md` for that version's own command transcript notes.
