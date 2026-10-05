# astroid

Boundary-version matrix for **astroid**, the deliberate inverse of the Clean
corpus's `shapebook`: 2 earliest supported versions, 1 middle, 2 end/latest --
matching the Clean corpus's own version-coverage methodology. Each `py3.X/`
subfolder is a complete, independent project; see its own README for exactly
what's wrong and the command.

| Version | Status |
|---|---|
| py3.6 | CODE-ONLY (not run against a live interpreter) |
| py3.7 | CODE-ONLY (not run against a live interpreter) |
| py3.11 | MEASURED WRONG -- 4 of 6 examined names failed to resolve (66%) |
| py3.13 | MEASURED WRONG -- 4 of 6 examined names failed to resolve (66%) |
| py3.14 | MEASURED WRONG -- 4 of 6 examined names failed to resolve (66%) |

3.6 and 3.7 are code-only (see their own READMEs). 3.11, 3.13 and 3.14 were
each measured for real against the actual installed `astroid` package
(4.3.3), with identical source and identical results.

## What's wrong here

A warehouse dispatch ledger package (`dispatch`) where 4 of the 6 non-builtin
identifiers astroid's own `Name.lookup()` is asked to resolve genuinely fail
to resolve: two names installed into a module's namespace by
`globals().update(...)` inside a wildcard-imported module, one bound only by
a module-level `exec("delta = 7")` string, and one read after a `del` that
genuinely removes its binding. All four run correctly at call time (all 5
tests pass); only astroid's static picture of each is wrong -- the exact
inverse of Clean's rule "no dynamic dispatch, star imports, exec,
metaclasses or monkey-patching, so astroid resolves every name."

`driver.py` reuses Clean's own two checks (`Name.lookup()`,
`ClassDef.getattr()`) unchanged, extended only to report the total number of
names examined alongside the failures, so the 66% is read directly off the
same population the pass/fail check walks.
