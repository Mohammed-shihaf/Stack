# cosmic-ray

**py3.14 boundary variant -- measured.** A real Python 3.14 interpreter
(3.14.0rc2) and this tool's own current release (cosmic-ray 8.7.0) were
both actually installed and invoked against this folder in the build
environment; the result below is real, not asserted.

Synthetic, deliberately-wrong Python project for **cosmic-ray**.

Domain: letter-grade banding, curving and roster statistics.

## What a wrong result looks like

Every test in the suite checks only one branch of its function with a
loose assertion (an `in (...)` membership over all possible outcomes, a
`>= 0` or `<= 100` bound) instead of an exact expected value. Most
comparison-operator, arithmetic-operator and constant mutants land inside
that slack and survive.

## Command

```bash
cosmic-ray init cosmic-ray.toml session.sqlite
cosmic-ray exec cosmic-ray.toml session.sqlite
cr-report session.sqlite
```

Real measured output:

```text
total jobs: 166
complete: 166 (100.00%)
surviving mutants: 141 (84.94%)
```

**84.94% survived (15.06% killed) -- well past the 50%-survival target.**
(166 jobs here vs. 165 on py3.11/py3.13 against the identical source: one
extra mutation site, a real interpreter-version difference in how `ast`
exposes this code's grammar, not a corpus inconsistency.)

## Layout

```text
gradeband/
  pyproject.toml
  cosmic-ray.toml
  src/gradeband/
    __init__.py
    bands.py
    curve.py
    stats.py
  tests/
    test_gradeband.py
```
