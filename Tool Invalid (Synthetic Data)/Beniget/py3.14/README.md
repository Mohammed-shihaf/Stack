# Beniget

**py3.14 boundary variant.** MEASURED WRONG: beniget's own def-use analysis genuinely finds a majority of this package's identifier uses unbound.

Synthetic, invalid-by-design Python project for **Beniget** -- the deliberate inverse of the Clean corpus's `seatplan`.

Domain: elevator dispatch bookkeeping for a single shaft.

## What's wrong here, and why it's genuine

Clean's version of this folder has beniget resolve every identifier -- no
unbound names, by construction. This one instead reads five names that
beniget's own `DefUseChains.compute_defs` genuinely cannot resolve, each a
real scoping defect rather than a confound:

* `record_request` reads `tag` after `del tag` removed its only binding.
* `close_call` reads `fault` after the `except RuntimeError as fault:`
  clause ends -- Python itself deletes that name at the end of the clause.
* `tally_requests` reads `floor` outside the list comprehension that bound
  it -- comprehension variables never leak into the enclosing scope in
  Python 3.
* `audit_trail` chains two such names: `cause` (another except-as read
  after its clause) assigned to `first`, which is then also `del`-ed before
  its own return.

None of this is a false positive: every one of these functions really does
raise (`UnboundLocalError` or `NameError`) the moment it is called, exactly
as beniget's static analysis says it will -- the four tests document that
directly with `pytest.raises`.

## Command

```bash
python -m driver
```

Measured: **5 of 9 examined identifier uses were unbound (55%)**, exit 1.

```text
src/liftqueue/dispatch.py: W: unbound identifier 'tag' at <unknown>:20:11
src/liftqueue/dispatch.py: W: unbound identifier 'fault' at <unknown>:29:11
src/liftqueue/dispatch.py: W: unbound identifier 'floor' at <unknown>:35:11
src/liftqueue/dispatch.py: W: unbound identifier 'cause' at <unknown>:44:12
src/liftqueue/dispatch.py: W: unbound identifier 'first' at <unknown>:46:11
5 unbound identifiers
5 of 9 examined identifier uses were unbound (55%)
```

Tool versions: **beniget 0.5.0**, **gast 0.7.0** (interpreter: CPython 3.14.0rc2).

No PEP 695 syntax appears anywhere in this folder -- the unbound identifiers
above are genuine scoping defects, not the uncontrolled `gast.TypeVar`
confound Clean's README warns about.

## Layout

```text
liftqueue/
  pyproject.toml      project root marker; zero dependencies
  src/liftqueue/
    __init__.py
    dispatch.py         the four functions driver.py walks
  tests/
    test_dispatch.py     documents each function's real bug with pytest.raises
  driver.py
```

## Notes

Clean's own driver reads `collector._undefs` directly after `.visit()`
completes. That attribute is a transient stack beniget's For/While handling
pushes and always pops before `.visit()` returns (see `process_undefs` in
beniget's source), so it is `[]` regardless of input -- checking it
afterward cannot observe anything, clean or broken. This driver instead
captures the real signal beniget itself emits: the `W: unbound identifier
...` line `unbound_identifier` prints the moment `compute_defs` fails to
resolve a name, which is genuine, real beniget output, not a separate,
invented check. The denominator (9) is every non-builtin identifier load in
the package, so the reported 55% is read directly off the same population
beniget is asked to resolve.
