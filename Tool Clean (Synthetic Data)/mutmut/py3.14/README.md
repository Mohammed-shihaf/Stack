# mutmut

**py3.14 boundary variant -- measured (interpreter pinned to 3.14.0rc2, matching this project's convention elsewhere).** A real Python 3.14 interpreter and this tool's own current release were both actually installed and invoked against this folder in the build environment; the result below is real, not asserted.


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
