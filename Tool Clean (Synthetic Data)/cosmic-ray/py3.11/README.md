# cosmic-ray

**py3.11 boundary variant -- the corpus's original middle version.** Measured clean or documented not-installed exactly as recorded in this corpus's very first build; unchanged by the later boundary-version work.


Synthetic, clean-by-design Python project for **cosmic-ray**.

Domain: bit-flag set operations.

## What a passing result looks like

Every mutant is killed: the surviving-mutant count is zero, so the mutation score is 100%. Each function is total over a small integer domain and the suite tests that domain exhaustively, which leaves a mutated operator or constant nowhere to hide.

## Command

```bash
cosmic-ray init cosmic-ray.toml session.sqlite && cosmic-ray exec cosmic-ray.toml session.sqlite && cr-report session.sqlite
```

Expected: `survival rate: 0.00%`

## Layout

```text
flagset/
  pyproject.toml      project root marker; zero dependencies
  src/flagset/
    __init__.py
    flags.py
  tests/
    test_flags.py
  cosmic-ray.toml
```

## Notes

cosmic-ray could not be installed in this environment -- its dependency chain hits a setuptools `install_layout` incompatibility in the container's Python, so pip cannot build a wheel. The folder ships its complete configuration and the exhaustive suite, but the mutation score here is **unverified**; run it on a host where the install succeeds. Exhaustive testing over a bounded domain is what makes 100% reachable rather than aspirational -- equivalent mutants are the usual reason a score stalls below it.
