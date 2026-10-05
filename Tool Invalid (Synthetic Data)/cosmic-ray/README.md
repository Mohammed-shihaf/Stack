# cosmic-ray

Boundary-version matrix for **cosmic-ray**, inverse corpus: each `py3.X/`
folder is a complete, independent project engineered to make a *real*
`cosmic-ray` run report a genuinely, measurably wrong (majority-surviving)
mutation score -- not an assertion, not a mocked number.

| Version | Status |
|---|---|
| py3.6 | CODE-ONLY (not run against a live interpreter) |
| py3.7 | CODE-ONLY (not run against a live interpreter) |
| py3.11 | MEASURED WRONG -- 140 survived / 165 total (84.85% survived) |
| py3.13 | MEASURED WRONG -- 140 survived / 165 total (84.85% survived) |
| py3.14 | MEASURED WRONG -- 141 survived / 166 total (84.94% survived) |

Real `cosmic-ray` version used: **8.7.0**. cosmic-ray installed and ran for
real in all three live venvs in this build environment (unlike Clean's
original 3.11 build, which hit a setuptools `install_layout`
incompatibility -- see Clean's own notes on this).

## What "wrong" means here

The source (`gradeband`, letter-grade banding, a flat curve bonus and
simple roster statistics) is ordinary, branching, comparison-heavy code --
exactly the shape `cosmic-ray`'s core mutation operators (
`ReplaceComparisonOperator`, `ReplaceBinaryOperator`, `NumberReplacer`,
`AddNot`, `ZeroIterationForLoop`, ...) target. The test suite
(`test_gradeband.py`) is a real, passing suite, but a defensibly weak one,
same strategy as the `mutmut` folder in this roster:

- `letter_grade`: the assertion is membership in *all five* possible
  letters, so a mutant that changes which letter comes back still passes.
- `is_honor_roll` / `passes`: only the true case is checked.
- `grade_gap_to_next_band` / `points_above_cutoff`: only `>= 0`, never an
  exact value.
- `apply_curve`: only `<= 100`, never the exact curved score, and the
  not-capped branch is only exercised incidentally.
- `average`: only `> 0`, never the exact mean.
- `highest` / `lowest`: `in scores` rather than the exact value, so even a
  mutant that returns the *wrong* element of `scores` can still pass.

This leaves wide behavioral slack for an independent mutation engine to
land mutants in, the same kind of gap `mutmut` found in its own folder,
confirmed here by a second, independent tool.

## Command

```bash
cosmic-ray init cosmic-ray.toml session.sqlite
cosmic-ray exec cosmic-ray.toml session.sqlite
cr-report session.sqlite
```

Real measured output (py3.11 / py3.13, identical source and identical
`cosmic-ray` version):

```text
total jobs: 165
complete: 165 (100.00%)
surviving mutants: 140 (84.85%)
```

py3.14 (same source, same `cosmic-ray` version, one additional mutation
site -- `ast`'s own grammar handling differs slightly by interpreter
version, a real environment difference rather than a contradiction, the
same kind Clean's own 3.11-vs-3.13 cosmic-ray note already records):

```text
total jobs: 166
complete: 166 (100.00%)
surviving mutants: 141 (84.94%)
```

**84.85% / 84.94% survived -- far past the 50%-survival target (15-16%
killed).**

## Layout

```text
gradeband/
  pyproject.toml      project root marker; zero dependencies
  cosmic-ray.toml      module-path, timeout, local distributor
  src/gradeband/
    __init__.py
    bands.py            letter_grade, is_honor_roll, grade_gap_to_next_band
    curve.py             apply_curve, passes, points_above_cutoff
    stats.py              average, highest, lowest
  tests/
    test_gradeband.py      one weak, loose-assertion test per function
```

## Notes

The source uses no builtin generic subscripting, no `dataclasses`, and no
`from __future__ import annotations` -- nothing in it has a floor above
Python 3.6, so the same source and the same demonstrated gap apply
unchanged across every version folder, including the code-only 3.6/3.7
ones.
