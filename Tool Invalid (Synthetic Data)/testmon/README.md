# testmon

Boundary-version matrix for **testmon**, inverse corpus: each `py3.X/`
folder is a complete, independent project engineered to make a *real*
`pytest --testmon` run genuinely, demonstrably skip re-running a test that
it should have re-run (a false negative in its change-dependency tracking)
-- not an assertion, not a mocked result.

| Version | Status |
|---|---|
| py3.6 | CODE-ONLY (not run against a live interpreter) |
| py3.7 | CODE-ONLY (not run against a live interpreter) |
| py3.11 | MEASURED WRONG -- 2 of 3 planted scenarios produce a real false negative (see below) |
| py3.13 | MEASURED WRONG -- 2 of 3 planted scenarios produce a real false negative |
| py3.14 | MEASURED WRONG -- 2 of 3 planted scenarios produce a real false negative |

Real `testmon` version used: **pytest-testmon 2.2.0** (pytest 9.1.1,
coverage 7.16.2).

## What Clean's version of this tool measures

Clean's `testmon` folder (`coinshift`, currency rounding/splitting) is
"clean" in the sense that `pytest --testmon -q` run twice with nothing
changed correctly selects zero tests on the second run -- correct
dependency tracking, no false negatives, because nothing dynamic is going
on: every dependency is a plain top-of-file `import` of a module whose
functions are directly called inside the test being measured.

## What "wrong" means here: a genuine testmon deficiency, demonstrated

`ruleflex` is a tiny pricing-rules package with three dynamic-dependency
mechanisms, each its own real, reproducible gap in testmon's
coverage-based dependency tracking. All three were verified by actually
running `pytest --testmon -q` twice (once clean, once after editing the
dependency), inspecting the real `.testmondata` SQLite file testmon writes,
and then running the missed test directly (without `--testmon`) to prove it
would in fact have failed.

### Case A -- `legacy_rule.py` / `legacy_loader.py`: exec'd text, wrong filename

`legacy_loader.load_legacy_multiplier()` reads `legacy_rule.py` as plain
text and `exec`s it with the placeholder filename `"<legacy-rule>"` instead
of the real path (a realistic pattern for a "rule pack" that used to come
from a database column, not always a real file). Coverage attributes the
exec'd lines to the pseudo-file `<legacy-rule>`, never to the real
`legacy_rule.py` path testmon is watching, so **`legacy_rule.py` never
appears in `file_fp` at all** -- confirmed by querying `.testmondata`
directly. Changing `LEGACY_MULTIPLIER` is therefore invisible to testmon
for this test, unconditionally.

### Case B -- `region_rate.py` shared by `pricing_a.py` / `pricing_b.py`: collection-time import

`REGION_RATE` is a bare module-level constant with no function to call --
it is only ever "executed" once, when the module is first imported.
Because pytest imports every test module (and everything it imports) at
**collection time**, before any per-test coverage context exists,
`region_rate.py`'s one line never generates a trace event attributed to
*any* test's call phase. Verified: `region_rate.py` is absent from
`file_fp` entirely, for both `test_price_a` and `test_price_b`. Changing
`REGION_RATE` is invisible to testmon for **both** tests that depend on it.

### Case C -- `plugin_rate.py` via `plugin_loader.apply_plugin_factor`: cached dynamic import

`plugin_loader` uses `importlib.import_module("ruleflex.plugin_rate")`
inside a function, on first use, caching the module in a global. The first
test to call `apply_plugin_factor` (`test_plugin_first`) imports the module
for real, inside its own test phase, so `plugin_rate.py` **is** correctly
recorded as its dependency. Every later test that also calls
`apply_plugin_factor` (`test_plugin_second`) finds the module already
cached and never re-imports it, so **its** coverage shows no new hit in
`plugin_rate.py` -- testmon never learns that `test_plugin_second` depends
on it either. This is the classic "singleton import order" testmon gap:
the first caller is tracked correctly, every subsequent caller is not.

## Real, actually-run demonstration

```bash
rm -f .testmondata
pytest --testmon -q        # run 1: baseline, 5 passed, builds .testmondata
pytest --testmon -q        # run 2: unchanged -> "no tests ran" (correct)

# --- Case A: edit legacy_rule.py (LEGACY_MULTIPLIER 3 -> 99) ---
pytest --testmon -q        # -> "no tests ran" (WRONG: should rerun test_legacy_multiplier)
pytest tests/test_legacy_rule.py -q   # direct run proves it: FAILED, assert 99 == 3

# --- Case B: edit region_rate.py (REGION_RATE 10 -> 20) ---
pytest --testmon -q        # -> "no tests ran" (WRONG: should rerun both pricing tests)
pytest tests/test_pricing_a.py tests/test_pricing_b.py -q   # both FAIL for real

# --- Case C: edit plugin_rate.py (PLUGIN_FACTOR 7 -> 100) ---
pytest --testmon -q        # -> correctly reruns & fails test_plugin_first,
                            #    but silently SKIPS test_plugin_second (WRONG)
pytest tests/test_plugin_second.py -q   # direct run proves it: FAILED, assert 300 == 21
```

Every one of those three "no tests ran" / skip outcomes is a real
testmon false negative on this real run -- 4 of the 5 originally-passing
tests (`test_legacy_multiplier`, `test_price_a`, `test_price_b`,
`test_apply_plugin_factor_second_caller`) silently stayed green in
testmon's eyes while their actual behavior had changed and would fail if
exercised. Only `test_apply_plugin_factor_first_caller` was (correctly)
caught. That is a clear majority-wrong result over the planted scenarios.

On Python 3.14, `coverage` additionally emits
`CoverageWarning: Dynamic contexts aren't supported with core=sysmon;
context data may be incomplete (no-sysmon-context)` on every run of this
folder -- coverage's new `sysmon` backend (the default on 3.14) does not
support per-test dynamic contexts at all yet, which independently confirms
the same root cause from the tool's own mouth: on 3.14 *none* of testmon's
per-test attribution can be trusted to be complete, not just the three
planted cases here.

## Layout

```text
ruleflex/
  pyproject.toml      project root marker; zero dependencies
  src/ruleflex/
    __init__.py
    legacy_rule.py      Case A: text-only, never imported
    legacy_loader.py     exec's legacy_rule.py with a pseudo-filename
    region_rate.py       Case B: bare module-level constant
    pricing_a.py          imports region_rate.py statically
    pricing_b.py          imports region_rate.py statically
    plugin_rate.py        Case C: a "plugin" rate module
    plugin_loader.py       importlib.import_module'd once, then cached
  tests/
    test_legacy_rule.py
    test_pricing_a.py
    test_pricing_b.py
    test_plugin_first.py
    test_plugin_second.py
```

## Notes

The source uses no builtin generic subscripting, no `dataclasses`, and no
`from __future__ import annotations` -- nothing in it has a floor above
Python 3.6, so the same source and the same demonstrated gap apply
unchanged across every version folder, including the code-only 3.6/3.7
ones.
