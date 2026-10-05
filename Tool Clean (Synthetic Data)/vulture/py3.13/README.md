# vulture

**py3.13 boundary variant -- measured.** A real Python 3.13 interpreter and this tool's own current release were both actually installed and invoked against this folder in the build environment; the result below is real, not asserted.


Synthetic, clean-by-design Python project for **vulture**.

Domain: an undirected graph with every member reachable.

## What a passing result looks like

vulture reports no dead code at 100% confidence and none at 60%: every module, class, method, attribute and constant is referenced from another module or from the suite, and there are no unused imports or unreachable branches.

## Command

```bash
vulture src/ tests/ --min-confidence 60 --ignore-names "test_*"
```

Expected: `(no output; exit 0)`

## Layout

```text
liveedge/
  pyproject.toml      project root marker; zero dependencies
  src/liveedge/
    __init__.py
    graph.py
    walk.py
  tests/
    test_liveedge.py
```

## Notes

`tests/` is passed alongside `src/` so vulture can see the usages, and `--ignore-names test_*` excludes the test functions themselves -- pytest calls them by collection, so vulture is right that nothing calls them and wrong that they are dead. Scanning `src/` alone would report every public function as unused, which is the mirror-image mistake.
