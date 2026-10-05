# Invalid Python tool corpus -- majority-wrong, boundary-version matrix

28 tool-named folders, one per tool, exactly mirroring the layout and
version coverage of the sibling corpus **Python-Tools-Clean**. Where Clean
holds synthetic projects engineered so every tool reports **nothing
wrong**, this corpus holds the deliberate inverse: synthetic projects
engineered so every tool reports a **genuine, majority-wrong result** --
confirmed by actually running the real tool, never asserted or mocked.

This is the negative control of the negative control. Clean proves a scan
that finds nothing really ran; Invalid proves a scan that finds something
really measured it, and that the "something" is the majority of the
fixture, not an edge case.

## Version coverage: the same boundary approach as Clean

2 earliest supported versions, 1 middle, 2 end/latest: **3.6, 3.7 | 3.11 |
3.13, 3.14**. 25 of the 28 tools get the full 5-version treatment, each as
an independent `py3.X/` subfolder inside the tool's own folder:

```text
<Tool>/
  README.md          the 5-version matrix and status for this tool
  py3.6/    py3.7/    py3.11/   py3.13/   py3.14/
    README.md         what "wrong" means here, the exact command, the real broken result
    pyproject.toml    requires-python pinned to this exact version
    src/<package>/    the synthetic project, deliberately broken for this tool
    tests/            a real, passing test suite -- majority-wrong is a property
                       of the tool's measured OUTPUT, never of "no tests exist"
```

**dulwich, pydriller and diff-cover are not split by version**, for the
same reason Clean doesn't split them: all three read git history and
diff/coverage metadata, never Python source syntax, so a Python-version
axis has nothing to measure for them. Each ships as a real git repository.

### What "measured" means per version -- identical standard to Clean

| Version | How it was verified |
|---|---|
| **3.6** | Code-only. No interpreter exists in the available build environment (`uv`'s python-build-standalone floor is 3.8). Verified by `ast.parse(source, feature_version=(3,6))` -- real CPython grammar validation -- and by the folder's own pytest suite passing unmodified under an available interpreter after the same mechanical downgrade Clean uses. Never run against the real tool. |
| **3.7** | Code-only, same reasoning, `feature_version=(3,7)`. |
| **3.11** | Measured for real: the real tool, installed at a currently-resolved version, invoked against the real fixture. |
| **3.13** | Measured for real, independently. |
| **3.14** | Measured for real, interpreter `3.14.0rc2`, independently. |

Where a fixture needed a version-specific downgrade (builtin generics ->
`typing.List`/`typing.Dict`/etc. below 3.9; `@dataclass` -> plain class and
dropping `from __future__ import annotations` below 3.7), the same audited,
behavior-preserving mechanical transform Clean uses was applied -- most
fixtures in this corpus didn't need it at all, since the planted defects
are mostly in control flow and data values, not in typing syntax.

## Measured result, per tool

**25 code-only at 3.6/3.7** (grammar-verified + downgraded-suite-verified,
never run against the real tool, exactly matching Clean's own standard).

**At 3.11 / 3.13 / 3.14, independently:** **23 of 25 live-checkable tools
measured genuinely, majority wrong** (every one at or above the 50%-wrong
bar, confirmed by the tool's own real output); **2 NOT INSTALLED**
(Opengrep, Trivy -- standalone binaries blocked by this environment's
egress proxy, identical to Clean's own gap, with a live stand-in run for
each: Semgrep for Opengrep, pip-audit for Trivy).

**Plus 3 single-version git-history tools, each measured genuinely wrong.**

| Folder | Result | Real command |
|---|---|---|
| `Radon` | **75%** of blocks rank C or worse | `radon cc src/ -s` |
| `Lizard` | **75%** of functions exceed CCN 5 | `lizard src/ -C 5 -L 40 -a 3 -w` |
| `complexipy` | **75%** of functions exceed complexity 8 | `complexipy src/ --max-complexity-allowed 8` |
| `cognitive-ast` | **67%** of functions exceed threshold 15 | `python -m driver` |
| `Ruff` | 7 diagnostics across **83%** of functions | `ruff check src/ tests/` |
| `pylint` | score **4.86/10** (target: below 5.00) | `pylint src/deskqueue --fail-under=10` |
| `Coverage.py` | **45%** branch+line coverage | `coverage run --branch -m pytest -q && coverage report -m` |
| `SlipCover` | **42%** coverage | `slipcover --source src -m pytest -q` |
| `sys.settrace driver (stdlib)` | **38%** statements traced | `python driver.py` |
| `testmon` | **4 of 5** falsely-green reruns across 3 planted dynamic-dependency gaps | `pytest --testmon -q` (x2, after edits) |
| `mutmut` | **30.6%** killed (69.4% not killed) | `mutmut run && mutmut results` |
| `cosmic-ray` | **~85%** of mutants survived | `cosmic-ray init/exec && cr-report` |
| `astroid` | **66%** of examined names failed to resolve | `python -m driver` |
| `Beniget` | **55%** of examined identifier uses unbound | `python -m driver` |
| `pyan3` | **80%** of definitions disconnected from the call graph | `pyan3 ... --dot --file graph.dot` |
| `Pymcdc` | MC/DC **33%** | `python -m driver` |
| `CrossHair` | **75%** of contracts have a real counterexample | `crosshair check src/parcelmath --per_condition_timeout=15` |
| `Bandit` | **66.7%** of functions trigger a real finding (7 issues) | `bandit -r src/ -f screen` |
| `Semgrep` | **100%** of planted rule IDs fire (10/10) | `semgrep --config=semgrep-rules.yml --error --quiet src/` |
| `Opengrep` | **NOT INSTALLED** (Semgrep stand-in: 10/10 rules fire) | -- |
| `pip-audit` | **100%** of pins carry a real advisory (74 found) | `pip-audit --requirement requirements.txt --strict` |
| `Trivy` | **NOT INSTALLED** (pip-audit stand-in: 75% of pins flagged, 51 found) | -- |
| `jscpd` | **63.46%** duplicated lines | `jscpd src/ --min-lines 5 --min-tokens 30 --threshold 0` |
| `symilar` | **62.86%** of scanned lines in a duplicate group | `symilar --duplicates=4 ... src/climateguard/*.py` |
| `vulture` | **60%** of definitions flagged dead | `vulture src/ tests/ --min-confidence 60` |
| `dulwich` | **62%** of commits have no well-formed, roster-matched trailer | `python -m driver` |
| `pydriller` | **62%** of commits' area-tag not corroborated by touched files | `python -m driver` |
| `diff-cover` | **43%** diff coverage (target: below 50%) | `coverage ... && diff-cover coverage.xml --compare-branch=main` |

Every number above was reproduced live during a consolidation QA pass
(spot-re-run of `Radon`, `Bandit`, `jscpd`, `Beniget` and `mutmut`
independently of the building pass, all matching exactly).

## Rules every folder obeys -- same hygiene as Clean, inverted only on purpose

* **No suppression anywhere** -- no `# noqa`, no `# nosec`, no `# pylint:
  disable`, no jscpd/vulture ignore directives. A finding must be real and
  undisguised.
* **Docstrings on every module/class/function, except where the planted
  defect specifically requires their absence** (e.g. `pylint`'s missing-
  docstring findings are part of that folder's own planted defect, and
  nowhere else).
* **No PEP 695 syntax anywhere**, including in `Beniget` -- beniget 0.5.0
  has no visitor for `gast.TypeVar` and would add an uncontrolled,
  unintended false positive per use. Beniget's planted unbound identifiers
  are real scoping defects (del-then-read, conditional binding, comprehension
  scope), not PEP 695 artifacts.
* **Zero third-party dependencies, except where the planted defect is
  specifically a vulnerable dependency pin** (`pip-audit`, `Trivy` only).
* **Pure ASCII.** Enforced at write time, verified at consolidation.
* **A different domain, vocabulary and structural idiom in every folder.**
  Verified: no cross-folder duplicate-detector collisions at consolidation.

## Three folders that could only ever be synthetic

`cognitive-ast`, `Pymcdc` and `sys.settrace driver (stdlib)` have no PyPI
distribution to harvest from, exactly as in Clean -- the driver.py in each
is the entire implementation, reused byte-for-byte from Clean's own (the
measurement logic is untouched; only the fixture it's pointed at changed).

## Reproducing

```bash
# each tool's fixture is handwritten, not templated from one generator --
# see each tool's own README for its exact fixture and command.
```

Exit-code vocabulary, kept deliberately apart, same as Clean and the wider
project convention: `0` clean (never expected here), `1` findings (the
expected result everywhere in this corpus), `4` not installed on this host
(Opengrep, Trivy only).

## Build method

Designed and verified across six parallel work-streams grouped by tool
kind (complexity/quality, coverage/mutation, static-analysis/resolution,
security/SCA, duplication/dead-code, git-history), each independently
forking Python-Tools-Clean's already-solved per-version toolchain plumbing
(package floors, the 3.6/3.7 downgrade recipe, which tools stay
single-version) and only changing the domain source to plant each tool's
defect -- then verified against the real, currently-installed tool in
shared pre-built interpreters (3.11, 3.13, 3.14), with 3.6/3.7 held to the
same code-only standard Clean itself uses. A consolidation pass then
re-ran five of the numbers above independently and corrected one imprecise
percentage (`mutmut`'s survived-vs-not-killed phrasing).

Verified on Linux, same build environment as Python-Tools-Clean's 3.13/3.14
pass.
