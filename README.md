# orderlab -- PY_V311_SETUPTOOLS_PIP_MONO

Order-pricing domain used as a white-box tool-evaluation fixture. One branch of
the Python 3.11 family: 24 branches across 3 build backends, 4 package managers
and 2 architectures. The domain layer is byte-identical on every branch, so any
difference in tool output is attributable to the branch variables alone.

## Branch variables

| Variable | This branch |
|---|---|
| Branch | `PY_V311_SETUPTOOLS_PIP_MONO` |
| Python | 3.11.13 |
| Build backend | setuptools 84.0.0 |
| Backend metadata | pyproject [project] |
| Package manager | pip 26.2.1 |
| Architecture | Monolith |
| Scenario | 1 - Monolithic |
| Source root | `src` |
| Branch usable | yes |

> **Build backend.** setuptools 84.0.0 -- the current latest release, admitted here without a rollback. Reads PEP 621 [project] natively; setup.cfg carries only the mutmut and pytest sections.

> **Package manager.** pip 26.2.1 -- the current latest release, running here without a rollback.

## Supported tools

29 tools are wired on this branch: 15 primary and 14 alternative, covering the
103-metric white-box framework. **29 of them can run on Python 3.11;
0 cannot.**

That is the measurement, not a defect. Every tool is pinned at its current
latest release, identically on all 24 branches, and the pins that this
interpreter excludes are guarded with an environment marker so they drop out of
resolution instead of failing it. A tool that cannot run exits **3**, not 0 --
a skip that looks like a pass is the failure mode this corpus exists to expose.

### Running here

| Tool | Role | Pin | Why |
|---|---|---|---|
| `CrossHair` | primary | `crosshair-tool==0.0.110` | crosshair-tool 0.0.110 declares >=3.8 but its real floor is 3.9. |
| `Coverage.py` | primary | `coverage==7.16.0` | Coverage.py 7.16.0 declares >=3.10. |
| `Pymcdc` | primary | `pymcdc==0.2.6` | pymcdc 0.2.6 declares >=3.10. |
| `Radon` | primary | `radon==6.0.1` | radon 6.0.1 declares no Requires-Python and imports cleanly on 3.8.. |
| `Lizard` | primary | `lizard==1.24.0` | lizard 1.24.0 -- a silent import crash on the 3.6 family, working from 3.7 onward. |
| `testmon` | primary | `pytest-testmon==2.2.0` | pytest-testmon 2.2.0 declares >=3.10. |
| `cognitive-ast` | primary | _binary / stdlib_ | Not a PyPI package -- no distribution of that name exists. |
| `jscpd` | primary | `jscpd@5.1.1` | jscpd 5.1.1 is an npm package that runs on Node, not on the project interpreter, so the Python version is irrelevant to it. |
| `pylint` | primary | `pylint==4.0.8` | pylint 4.0.8 declares >=3.10. |
| `Semgrep OSS` | primary | `semgrep==1.176.0` | semgrep 1.176.0 declares >=3.10, and bandit 1.9.4 with it. |
| `Bandit` | primary | `bandit==1.9.4` | bandit 1.9.4 declares >=3.10. |
| `pip-audit` | primary | `pip-audit==2.10.1` | pip-audit 2.10.1 declares >=3.10. |
| `cosmic-ray` | primary | `cosmic-ray==8.7.0` | cosmic-ray 8.7.0 declares >=3.9. |
| `Beniget` | primary | `beniget==0.5.0` | beniget 0.5.0 declares >=3.6 and means it. |
| `PyDriller` | primary | `pydriller==2.10` | pydriller 2.10 works. |
| `Ruff` | alternative | `ruff==0.16.5` | ruff 0.16.5 -- alternative for 19 of the 103 metrics. |
| `complexipy` | alternative | `complexipy==7.0.1` | complexipy 7.0.1 declares >=3.8. |
| `symilar (pylint)` | alternative | `pylint==4.0.8` | symilar ships inside pylint 4.0.8, so it arrives with it. |
| `Opengrep` | alternative | _binary / stdlib_ | Standalone binary with its own parser. |
| `Opengrep (taint mode)` | alternative | _binary / stdlib_ | Same binary, taint mode. |
| `Trivy` | alternative | _binary / stdlib_ | Standalone binary; scans manifests and lockfiles, never the interpreter. |
| `SlipCover` | alternative | `slipcover==1.1.0` | slipcover 1.1.0 declares >=3.9,<3.15. |
| `mutmut` | alternative | `mutmut==3.7.0` | mutmut 3.7.0 declares >=3.10. |
| `diff-cover` | alternative | `diff-cover==10.5.1` | diff-cover 10.5.1 declares >=3.10. |
| `astroid` | alternative | `astroid==4.0.4` | astroid 4.0.4, NOT the latest 4.3.1 -- and this is the one place in the corpus where the latest-everywhere policy had to yield. |
| `pyan3 + astroid` | alternative | `pyan3==2.8.1` | pyan3 2.8.1 declares >=3.10,<3.16. |
| `pylint + vulture` | alternative | `vulture==2.16` | vulture 2.16 declares >=3.9. |
| `dulwich` | alternative | `dulwich==1.2.14` | dulwich 1.2.14 declares >=3.10. |
| `sys.settrace driver (stdlib)` | alternative | _binary / stdlib_ | stdlib sys.settrace driver, written 3.6-compatible.. |

### Dark here

_(none)_

**No tool on this branch lies about itself,** and none has since
3.9. Every distribution that installs also imports, and every one that imports
also runs when invoked -- which is the only level of evidence this corpus
accepts. `crosshair-tool` still declares `>=3.8` while its real floor is 3.9;
that claim is simply no longer load-bearing this far up.

### What moved since the earlier families

| | 3.6 | 3.7 | 3.8 | 3.9 | 3.10 | 3.11 |
|---|---|---|---|---|---|---|
| Tools running | 5 | 7 | 12 | 16 | 29 | **29** |
| Silent liars | 2 | 1 | 1 | 0 | 0 | **0** |
| Branches that build | 12/24 | 12/24 | 22/24 | 24/24 | 24/24 | **24/24** |
| PEP 621 `[project]` | 0 | 8 | 16 | 24 | 24 | **24** |
| Infra pins at latest | none | none | uv | uv, wheel | all 7 | **all 7** |

- **Nothing in the roster moved.** 29 tools ran on 3.10 and 29 run
  here; no pin was bumped, rolled back or newly excluded. The tool axis
  converged at 3.10 and has stopped.
- **Nothing in the infrastructure moved either.** setuptools, poetry-core,
  uv_build, wheel, pip, poetry and pytest are all at latest on both families.
- **`tomllib` is stdlib from here (PEP 680).** `Tool Triggering (Synthetic Data)/full_check.py` has
  carried a hand-written line scanner since 3.6 for the interpreters with no
  TOML parser; on this family the real parser runs, and the checker prints
  which of the two paths it took.
- **Three transitives differ from 3.10 despite identical declarations:**
  `async-timeout` 5.0.1 is resolved on 3.10 and absent here (it backports
  `asyncio.timeout`, stdlib from 3.11), `rpds-py` moves 0.30.0 to 2026.6.3 and
  `stevedore` 5.8.0 to 5.9.1. Declared-identical is not resolved-identical.

## Build

```
python -m pip install --upgrade 'pip==26.2.1'
python -m pip install -e . -r requirements-dev.txt
```

> Both the backend and the package manager on this branch run on Python 3.11.13 for real; the branch installs, locks and tests cleanly.

## Run

```
python -m orderlab
```



## Test

```
python -m pytest -q   # pytest 9.1.1
python "Tool Triggering (Synthetic Data)/full_check.py"   # cross-file consistency audit
```

pytest is pinned at 9.1.1, which is its current latest
release -- on this family the infrastructure pins cost nothing. It is
infrastructure, not one of the 29 roster tools, and so is exempt from the
latest-only policy either way: a branch whose tests cannot run is not a
branch.

## Workspace layout

```
python-corpus/  (PY_V311_SETUPTOOLS_PIP_MONO)
|-- .github/  (1 files)
|-- src/  (20 files)
|-- tests/  (7 files)
|-- Tool Clean (Synthetic Data)/  (1020 files)
|-- Tool Invalid (Synthetic Data)/  (1186 files)
|-- Tool Triggering (Synthetic Data)/  (76 files)
|-- Tool Triggering (Tool Github Test data)/  (20671 files)
|-- .editorconfig
|-- .gitignore
|-- .python-version
|-- README.md
|-- dataset.json
|-- pip.conf
|-- pyproject.toml
|-- pytest.ini
|-- requirements-dev.txt
|-- requirements-runtime.txt
|-- requirements.lock
|-- setup.cfg
```

### Monolith

One deployable unit. `src/orderlab` holds the whole domain, and the analysis
fixtures sit alongside it. Untrusted input reaches the code through argv, the
process environment, file contents and public function parameters -- there is
no request object anywhere in this branch, which is the point: a taint engine
that only recognises a web request finds nothing here.



## Tool test-data folders

Three sibling folders sit at the repo root, alongside this branch's own
`Tool Triggering (Synthetic Data)/` (above).

### `Tool Triggering (Tool Github Test data)/`
Each of the 26 tool subfolders is that tool's own real upstream test suite,
pulled as-is from its actual GitHub project -- not generated. `Radon/` is
radon's own pytest suite; `pydriller/` is pydriller's own test suite;
`settrace/` is CPython's own `Lib/test/test_sys_settrace.py` (tag v3.14.8),
because `sys.settrace` is a CPython feature with no tool project of its own;
`Opengrep/` is the real opengrep/semgrep test corpus (1,000+ files of rules,
parsing fixtures and snapshots). `pymcdc` and `cognitive-ast` have no public
upstream test suite, so they have no folder here. A correct run finds whatever
that upstream project's own tests genuinely contain.

### `Tool Clean (Synthetic Data)/`
25 of the 28 tools each carry 5 generated fixture packages, one per Python
interpreter (3.6, 3.7, 3.11, 3.13, 3.14), each a self-contained package
(`pyproject.toml`, `src/<module>/`, `tests/`) under its own invented domain
name -- engineered to be clean, so the tool should report zero findings:
the **Tool Clean (100% pass)** condition. The remaining 3 tools
(`diff-cover`, `dulwich`, `pydriller`) operate on git history rather than
interpreter syntax, so each carries one real git repository's worth of
history instead of 5 per-version copies -- restored from `_git-bundles/`
via `restore-clean-git.ps1` rather than kept as a live `.git` folder, so a
plain file copy never silently drops their content. `_generator/` holds the
scripts that built every fixture.

### `Tool Invalid (Synthetic Data)/`
Same shape as Clean -- 25 tools x 5 Python-version fixtures, plus the same
3 git-history tools -- but every fixture is engineered to make the tool
flag or fail rather than pass: the **Tool Invalid** condition. `_git-bundles/`
backs up each git-history tool's real history, with `restore-invalid-git.ps1`
to rebuild it; `live_results.json` and this folder's own README/archive
travel with it.

## Tool entry points

Every tool directory carries a `trigger.yaml` recording its pin, its declared
floor, its measured status on this interpreter and what a working run should
find. Run one tool directly, or all of them:

```
bash "Tool Triggering (Synthetic Data)/radon/run_radon.sh"
python "Tool Triggering (Synthetic Data)/tool_integration.py" --run
python "Tool Triggering (Synthetic Data)/tool_integration.py" --verify
```

`--run` distinguishes three outcomes: a tool that ran, a tool that skipped for
a reason `dataset.json` already records, and a tool that skipped for a reason
it does not. Only the third is a finding.

## Planted fixtures

Every tool is pointed at something it should find. Without these, a tool that
ran and reported nothing is indistinguishable from a tool that silently
no-opped.

| Fixture | File | Planted for |
|---|---|---|
| Duplication | [`src/orderlab/services/retail_order_processor.py`](src/orderlab/services/retail_order_processor.py) + [`wholesale_order_processor.py`](src/orderlab/services/wholesale_order_processor.py) | jscpd, symilar |
| Complexity | [`src/orderlab/analysis/complexity_sample.py`](src/orderlab/analysis/complexity_sample.py) | Radon, Lizard, complexipy, cognitive-ast |
| Lint | [`src/orderlab/analysis/lint_violations.py`](src/orderlab/analysis/lint_violations.py) | pylint, Ruff |
| SAST | [`src/orderlab/analysis/sast_fixture.py`](src/orderlab/analysis/sast_fixture.py) | Semgrep + Bandit, Opengrep |
| Taint | [`src/orderlab/analysis/taint_fixture.py`](src/orderlab/analysis/taint_fixture.py) | Opengrep taint mode |
| Dead code | [`src/orderlab/analysis/dead_code.py`](src/orderlab/analysis/dead_code.py) | vulture, pylint |
| Call graph | [`src/orderlab/analysis/call_graph_sample.py`](src/orderlab/analysis/call_graph_sample.py) | pyan3 + astroid, Beniget |
| Vulnerable pins | [`requirements-runtime.txt`](requirements-runtime.txt) | pip-audit, Trivy |

The duplicate pair also co-changes three times in the git history, so a
change-coupling tool and a duplication tool should agree on it.

The five planted pins carry 45 live advisories between them,
confirmed against the PyPI JSON API on 3 September 2026. The planted set is **not** identical to the families below
3.10: `urllib3` moved 2.0.6 to 2.2.2 because dulwich requires `>=2.2.2`, and
`paramiko` 2.4.1 to 2.10.1 because 2.4.1 imports `collections.MutableMapping`,
removed in 3.10. The 3.10 and 3.11 families share the set exactly, so the SCA
metrics are directly comparable across those two.

`six` sits beside them in a clearly separated support section — paramiko
2.10.1 imports it without declaring it, and cryptography 42 no
longer supplies it by accident. Every one is genuinely imported by
[`src/orderlab/platform/integrations.py`](src/orderlab/platform/integrations.py) --
a pin nothing imports produces a manifest-versus-source disagreement that looks
like a tool defect and is not.

## History

Roughly 45 synthetic commits, authored as Prajith Kumaravel with three
co-authors carried in `Co-authored-by:` trailers. Measured on this family:
14-20% of commits each, three distinct names. A history tool
that reads only the author field reports one contributor at 100% and is wrong.
The processor pair co-changes three times; the tool runners co-change as a
cluster.

## Machine-readable

[`dataset.json`](dataset.json) carries every branch variable, the full tool
status breakdown with the verbatim reason for each dark tool, and the planted
fixture inventory. It is the answer key: a run is correct when what the tool
platform reports matches what `dataset.json` says should happen, **including
the tools that are supposed to be dark**.
