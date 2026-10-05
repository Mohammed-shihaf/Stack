# mutmut

**py3.11 boundary variant -- the corpus's original middle version.** Measured clean or documented not-installed exactly as recorded in this corpus's very first build; unchanged by the later boundary-version work.


Synthetic, clean-by-design Python project for **mutmut**.

Domain: rounding helpers over a small integer domain.

## What a passing result looks like

No mutant survives. Every helper is total over a bounded integer domain and the suite asserts an explicit expected value for every point in that domain, so any mutated constant or operator changes an asserted result.

## Command

```bash
mutmut run && mutmut results
```

Expected: `no surviving mutants`

## Layout

```text
roundkit/
  pyproject.toml      project root marker; zero dependencies
  src/roundkit/
    __init__.py
    nearest.py
    buckets.py
  tests/
    test_roundkit.py
  setup.cfg
```

## Notes

`setup.cfg` carries `[mutmut] source_paths` because **mutmut 3.x reads its configuration from setup.cfg and ignores pyproject.toml** -- without it mutmut exits with `Could not figure out where the code to mutate is`, which reads like a corpus defect and is not one. The expected values are written out as a literal table rather than computed by a reference implementation, so a mutant cannot corrupt the oracle and the test at the same time.
