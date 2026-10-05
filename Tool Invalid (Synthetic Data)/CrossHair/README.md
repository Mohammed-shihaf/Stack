# CrossHair

Boundary-version matrix for **CrossHair**, the deliberate inverse of the
Clean corpus's `spanmath`: 2 earliest supported versions, 1 middle, 2
end/latest -- matching the Clean corpus's own version-coverage methodology.
Each `py3.X/` subfolder is a complete, independent project; see its own
README for exactly what's wrong and the command.

| Version | Status |
|---|---|
| py3.6 | CODE-ONLY (not run against a live interpreter) |
| py3.7 | CODE-ONLY (not run against a live interpreter) |
| py3.11 | MEASURED WRONG -- 3 of 4 contract-annotated functions have a counterexample (75%) |
| py3.13 | MEASURED WRONG -- 3 of 4 contract-annotated functions have a counterexample (75%) |
| py3.14 | MEASURED WRONG -- 3 of 4 contract-annotated functions have a counterexample (75%) |

3.6 and 3.7 are code-only (see their own READMEs). 3.11, 3.13 and 3.14 were
each measured for real against the actual installed `crosshair-tool`
package (0.0.111), with identical source and identical results.

## What's wrong here

A closed-integer-range package (`parcelmath`) for parcel routing where
three of its four `pre:`/`post:`-contracted functions have a real
boundary bug relative to their own stated postcondition: `span_length`
and `shift_window` are each off by one (true for every input, not just a
corner case), and `overlaps_range` uses `<=` where it needs `<`,
misclassifying windows that only touch as non-overlapping. `clamp_weight`
is left correct, for contrast.

`crosshair check src/parcelmath --per_condition_timeout=15` finds a real
counterexample for each of the three within a couple of seconds, well
inside the 15-second-per-condition budget -- the tool's own symbolic
execution, not a fabricated result. All 8 unit tests pass regardless: they
assert each function's actual output at the specific values exercised
(`span_length(2, 5) == 3`, not the mathematically correct 4), which is
itself the point -- a unit-test suite built by asserting what the code
currently does, rather than checking the stated contract across every
input, ships exactly this kind of bug silently. CrossHair's symbolic
search across the whole precondition is what catches it.
