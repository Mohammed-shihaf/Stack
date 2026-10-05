# cosmic-ray

**py3.11 boundary variant -- measured.** A real Python 3.11 interpreter and
this tool's own current release (cosmic-ray 8.7.0) were both actually
installed and invoked against this folder in the build environment; the
result below is real, not asserted.

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
total jobs: 165
complete: 165 (100.00%)
surviving mutants: 140 (84.85%)
```

**84.85% survived (15.15% killed) -- well past the 50%-survival target.**

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
