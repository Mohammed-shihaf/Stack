# Clean Python tool corpus -- 100% passing

28 tool-named folders, one per tool, mirroring the layout of the harvested
`Python Tools` set. Where that set holds each tool's **own upstream test
suite**, this one holds synthetic projects built to the opposite goal: every
tool must run and report **nothing wrong**.

This is the negative control the tool-evaluation corpora do not have. The
corpora plant defects to be found -- a cyclomatic peak of 21, a co-changing
duplicate pair, four taint flows, five vulnerable dependency pins. A clean
baseline is what makes those findings legible, because a family where nothing
fires cannot distinguish *correctly detected nothing* from *the scan never
ran*.

## Measured result

Not asserted. Every tool that can be installed in the build environment was
actually invoked against its folder, and the table records what it returned.
Three tools could not be installed and are recorded as such rather than being
quietly counted as passing -- collapsing "absent from this host" into "clean"
is the one thing a corpus like this must never do.

**25 measured clean, 0 findings, 3 not invoked.**

| Folder | Result | Command |
|---|---|---|
| `Bandit` | measured clean | `bandit -r src/ -f screen` |
| `Beniget` | measured clean | `python -m driver` |
| `Coverage.py` | measured clean | `coverage run --branch -m pytest -q && coverage report -m --fail-under=100` |
| `CrossHair` | measured clean | `crosshair check src/spanmath --per_condition_timeout=15` |
| `Lizard` | measured clean | `lizard src/ -C 5 -L 40 -a 3 -w` |
| `Opengrep` | **not invoked here** | `opengrep --config=semgrep-rules.yml --error src/` |
| `Pymcdc` | measured clean | `python -m driver` |
| `Radon` | measured clean | `radon cc src/ -s -n B && radon mi src/ -n B` |
| `Ruff` | measured clean | `ruff check src/ tests/ && ruff format --check src/ tests/` |
| `Semgrep` | measured clean | `semgrep --config=semgrep-rules.yml --error --quiet src/` |
| `SlipCover` | measured clean | `slipcover --source src -m pytest -q` |
| `Trivy` | **not invoked here** | `trivy fs --scanners vuln,secret --exit-code 1 .` |
| `astroid` | measured clean | `python -m driver` |
| `cognitive-ast` | measured clean | `python -m driver` |
| `complexipy` | measured clean | `complexipy src/ --max-complexity-allowed 8` |
| `cosmic-ray` | **not invoked here** | `cosmic-ray init cosmic-ray.toml session.sqlite && cosmic-ray exec cosmic-ray.toml session.sqlite && cr-report session.sqlite` |
| `diff-cover` | measured clean | `coverage run --branch -m pytest -q && coverage xml && diff-cover coverage.xml --compare-branch=main --fail-under=100` |
| `dulwich` | measured clean | `python -m driver` |
| `jscpd` | measured clean | `jscpd src/ --min-lines 5 --min-tokens 30 --threshold 0 --reporters console` |
| `mutmut` | measured clean | `mutmut run && mutmut results` |
| `pip-audit` | measured clean | `pip-audit --requirement requirements.txt --strict` |
| `pyan3` | measured clean | `pyan3 src/pipeflow/*.py --uses --defines --colored --grouped --dot --file graph.dot` |
| `pydriller` | measured clean | `python -m driver` |
| `pylint` | measured clean | `pylint src/shelfmark --fail-under=10` |
| `symilar` | measured clean | `symilar --duplicates=4 --ignore-comments --ignore-docstrings src/checkfour/*.py` |
| `sys.settrace driver (stdlib)` | measured clean | `python -m driver` |
| `testmon` | measured clean | `pytest --testmon -q && pytest --testmon -q` |
| `vulture` | measured clean | `vulture src/ tests/ --min-confidence 60 --ignore-names "test_*"` |

### Why three were not invoked

| Tool | Reason |
|---|---|
| **Trivy** | Standalone Go binary; its release host is refused at the build environment's egress proxy. The zero-dependency claim was verified with `pip-audit` instead, which reports no known vulnerabilities. |
| **Opengrep** | Standalone binary, same egress refusal. Measured with `semgrep` against the same committed ruleset as a stand-in (0 findings). Opengrep is the Semgrep fork and shares the rule format, but a stand-in is evidence, not proof. |
| **cosmic-ray** | Its dependency chain hits a setuptools `install_layout` incompatibility in this container's Python, so pip cannot build a wheel. The folder ships a complete `cosmic-ray.toml` and an exhaustive suite; the mutation score is unverified. |

Run `_generator/verify.py` on a host where those three install and the table
closes.

## Layout

Every folder is an independent, self-contained project:

```text
<Tool Name>/
  README.md          what clean means for this tool, the command, the expected result
  pyproject.toml     project root marker; zero dependencies; pytest pythonpath
  .gitignore         the state the tools generate
  src/<package>/     the synthetic project -- a different domain in every folder
  tests/             the suite, where the asserts live
  driver.py          only where the tool ships no CLI (beniget, astroid, pymcdc,
                     cognitive-ast, dulwich, pydriller, settrace)
_generator/          build.py, specs/, rules.py, verify.py
```

## Rules every folder obeys

These hold across the whole tree, so each project is clean for *its* tool
without tripping any of the others:

* **No `assert` in `src/`.** Bandit B101 has no exemption outside tests, so the
  asserts live in `tests/` only.
* **Docstrings on every module, class and function**, and no `# pylint:
  disable` anywhere -- a suppressed message is not a clean result.
* **Cyclomatic complexity <= 5, cognitive complexity well under 15.**
* **Every definition referenced by a test**, so vulture reports no dead code.
* **No dynamic dispatch, star imports, `exec`, metaclasses or monkey-patching**,
  so astroid resolves every name and pyan3 resolves every call.
* **No PEP 695 syntax anywhere.** beniget 0.5.0 has no visitor for
  `gast.TypeVar` and emits one false unbound identifier per *use* of a type
  parameter, at exit 0. A passing beniget folder is only possible while that
  syntax is absent, so generics use `typing.TypeVar`.
* **Zero third-party dependencies.** pip-audit and Trivy are clean by
  construction rather than by today's advisory feed -- a pinned-but-currently-
  clean list becomes dirty the week a CVE lands, with nothing in the folder
  having changed.
* **Pure ASCII.** Not every analyser reads source with the build file's declared
  encoding rather than the platform default, so a stray non-ASCII byte can
  change what a tool reports without changing what the interpreter accepts.
  That is the class of silent difference this corpus exists to rule out, so it
  must not originate here. Enforced at write time.
* **A different domain, vocabulary and structural idiom in every folder**, so
  the duplicate detectors find nothing. Verified: **0 clones across all 28
  folders** at 5 lines / 30 tokens, tests included.

## Reproducing

```bash
python3 _generator/build.py <output-dir>     # idempotent; never touches .git
python3 _generator/verify.py <output-dir>    # runs every tool, exits 1 on findings
```

`verify.py` uses the corpora's exit-code vocabulary, kept deliberately apart:
`0` clean, `1` findings, `4` not installed on this host.

It also clears generated state before and after each run. A leftover `mutants/`
tree is a clone group and a stale `.coverage` makes a coverage claim no current
run supports, so a verification pass leaves the tree exactly as the generator
wrote it.

## Three folders that could only ever be synthetic

`cognitive-ast`, `Pymcdc` and `sys.settrace driver (stdlib)` are **empty** in
the harvested set, for a concrete reason: there is nothing upstream to harvest.
There is no PyPI distribution named `cognitive-ast` at all -- the roster
implements it as a standard-library `ast` scorer, and `driver.py` here is that
scorer. `sys.settrace` is the standard library, so the driver is written by
whoever needs it. Synthetic data is the only way those three folders can exist.

## Tool versions used for the measurement

```text
bandit       bandit 1.9.4
coverage     Coverage.py, version 7.16.2 with C extension
crosshair    0.0.111
lizard       1.24.0
radon        6.0.1
ruff         ruff 0.15.11
semgrep      1.178.0
slipcover    SlipCover v1.1.0 (Python 3.11.15)
complexipy   complexipy 8.0.1
pylint       pylint 4.1.1
vulture      vulture 2.16
pip-audit    pip-audit 2.10.1
mutmut       3.3.1
diff-cover   diff-cover 10.6.0
pyan3        pyan3 2.8.1
jscpd        jscpd 5.3.3
beniget      0.5.0
gast         0.7.0
astroid      4.3.2
dulwich      1.2.15
pydriller    2.12
pytest       9.1.1
pytest-testmon 2.2.0
pymcdc       0.2.6
python       Python 3.11.15
```

Verified on Linux, Ubuntu 24.04.4 LTS.
