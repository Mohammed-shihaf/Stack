# Beniget

Boundary-version matrix for **Beniget**, the deliberate inverse of the Clean
corpus's `seatplan`: 2 earliest supported versions, 1 middle, 2 end/latest --
matching the Clean corpus's own version-coverage methodology. Each `py3.X/`
subfolder is a complete, independent project; see its own README for exactly
what's wrong and the command.

| Version | Status |
|---|---|
| py3.6 | CODE-ONLY (not run against a live interpreter) |
| py3.7 | CODE-ONLY (not run against a live interpreter) |
| py3.11 | MEASURED WRONG -- 5 of 9 examined identifier uses were unbound (55%) |
| py3.13 | MEASURED WRONG -- 5 of 9 examined identifier uses were unbound (55%) |
| py3.14 | MEASURED WRONG -- 5 of 9 examined identifier uses were unbound (55%) |

3.6 and 3.7 are code-only (see their own READMEs). 3.11, 3.13 and 3.14 were
each measured for real against the actual installed `beniget` package
(0.5.0, paired with `gast` 0.7.0), with identical source and identical
results.

## What's wrong here

An elevator dispatch bookkeeping package (`liftqueue`) where 5 of the 9
non-builtin identifier uses beniget's own `DefUseChains` is asked to
resolve genuinely have no live definition: a name read after `del`, a name
read after the `except ... as name:` clause that bound it ends (Python
itself deletes that binding there), a list comprehension's loop variable
read outside the comprehension, and a chained pair of both. Every one of
these is a real bug, not a contrived confound -- each affected function
raises (`UnboundLocalError` or `NameError`) the moment it is actually
called, which the test suite documents with `pytest.raises`. No PEP 695
syntax appears anywhere, so none of this is beniget 0.5.0's known
`gast.TypeVar` blind spot; it is genuine unbound-identifier detection,
exactly as the task calls for.

`driver.py` does **not** reuse Clean's own check (`collector._undefs` read
after `.visit()` returns) unchanged: that attribute is a transient stack
beniget's own For/While handling always pops back to empty before
`.visit()` finishes, so it is `[]` whether the code is clean or riddled
with unbound names -- reading it afterward cannot observe anything. This
driver instead captures the real `W: unbound identifier ...` line beniget
prints the moment it fails to resolve a name, which is beniget's own
genuine, real diagnostic output, and counts the total number of non-builtin
identifier uses in the package as the denominator, so the reported
percentage is read directly off the same population beniget examines.
