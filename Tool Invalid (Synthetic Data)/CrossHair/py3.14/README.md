# CrossHair

**py3.14 boundary variant.** MEASURED WRONG: CrossHair's symbolic execution genuinely finds a counterexample for a majority of this package's contract-annotated functions.

Synthetic, invalid-by-design Python project for **CrossHair** -- the deliberate inverse of the Clean corpus's `spanmath`.

Domain: closed integer weight/distance ranges for parcel routing.

## What's wrong here, and why it's genuine

Clean's version of this folder has every `pre:`/`post:` contract hold for
all inputs satisfying its precondition. This one keeps the same four
functions and the same contract style, but three of the four
implementations have a real, boundary bug relative to their own stated
postcondition:

* `span_length` returns `high - low` instead of `high - low + 1`, so its
  `post: __return__ >= 1` is false whenever `low == high`.
* `shift_window` returns `(low + offset, high + offset + 1)`, so its
  length-preservation postcondition is false for every input, not just a
  corner case.
* `overlaps_range` tests `first_high <= second_low` (and the symmetric
  case) instead of `<`, so two windows that only touch at a single integer
  are reported as not overlapping, contradicting the stated postcondition's
  definition of overlap.

`clamp_weight` is left correct, for contrast with the three genuine
defects.

## Command

```bash
crosshair check src/parcelmath --per_condition_timeout=15
```

Measured: **3 of 4 contract-annotated functions have a counterexample (75%)**, exit 1.

```text
src/parcelmath/span.py:28: error: false when calling span_length(0, 0) (which returns 0)
src/parcelmath/span.py:37: error: false when calling shift_window(0, 0, 0) (which returns (0, 1))
src/parcelmath/span.py:48: error: false when calling overlaps_range(0, 0, 0, 0) (which returns False)
```

(Line numbers above are relative to the project root; CrossHair found all
three within a couple of seconds, well inside the 15s per-condition
timeout.)

Tool version: **crosshair-tool 0.0.111** (interpreter: CPython 3.14.0rc2).

## Layout

```text
parcelmath/
  pyproject.toml      project root marker; zero dependencies
  src/parcelmath/
    __init__.py
    span.py              the four contract-annotated functions
  tests/
    test_span.py          all 8 tests pass
```

## Notes

All 8 tests pass. They assert each function's actual output at the
specific values exercised, which is itself the point: `span_length(2, 5)`
really does return 3, not the mathematically correct 4, and a unit-test
suite built by asserting what the code currently does -- rather than
checking the stated contract across every input -- ships exactly this kind
of bug silently. CrossHair's symbolic execution, unlike the example-based
tests, searches across the whole precondition and finds the inputs (all at
the `low == high` / touching boundary) where the postcondition and the
implementation disagree.
