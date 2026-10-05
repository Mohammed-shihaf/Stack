# astroid

**py3.11 boundary variant.** MEASURED WRONG: astroid genuinely fails to resolve a majority of the names this package asks it to resolve.

Synthetic, invalid-by-design Python project for **astroid** -- the deliberate inverse of the Clean corpus's `shapebook`.

Domain: a warehouse dispatch ledger.

## What a passing (Clean) result would look like, and why this isn't one

Clean's version of this folder has astroid infer every name: no node resolves without a definition. This package instead runs correctly at call time while making astroid's static picture of it wrong, through four real gaps in what a static reader can see:

1. `record_entry` / `report_window` read names (`ledger_tag`, `window_code`) whose only binding is a wildcard import of a module that installs its attributes with `globals().update(...)` at runtime, not a plain assignment astroid's rebuilder can record.
2. `apply_adjustment` reads a name (`delta`) bound only by a module-level `exec("delta = 7")` string -- a real binding at runtime, invisible to static parsing.
3. `close_window` reads a name (`counter`) that was `del`-ed earlier in the same scope; astroid's own flow-sensitive `lookup()` correctly determines no live definition reaches that point.

All three classes of defect are genuine astroid inference failures: `Name.lookup()` returns no definitions for each one, which is exactly the check the driver (and Clean's driver) performs.

## Command

```bash
python -m driver
```

Measured: **4 of 6 examined names failed to resolve (66%)**, exit 1.

```text
src/dispatch/ledger.py: 19: ledger_tag
src/dispatch/ledger.py: 24: window_code
src/dispatch/ledger.py: 29: delta
src/dispatch/ledger.py: 37: counter
4 unresolved names
4 of 6 examined names failed to resolve (66%)
```

Tool version: **astroid 4.3.3** (interpreter: CPython 3.11.15).

## Layout

```text
dispatch/
  pyproject.toml      project root marker; zero dependencies
  src/dispatch/
    __init__.py
    _dynamic.py        installs two names via globals().update(), not assignment
    ledger.py           the five functions driver.py walks
  tests/
    test_ledger.py      all pass -- the code is correct; only astroid's view of it is wrong
  driver.py
```

## Notes

`driver.py` asks the same question Clean's driver asks -- does every identifier resolve to a definition astroid can see -- and reuses its exact two checks (`Name.lookup()`, `ClassDef.getattr()`), extended only to also report the total number of names examined so the failure ratio is a real count, not an invented one. There is no class in this package, so the `getattr()`-based method check contributes nothing either way; the 66% comes entirely from genuine `Name.lookup()` failures. Every test passes: the ledger's runtime behavior is correct, which is the point -- astroid's static resolution is wrong about code that works.
