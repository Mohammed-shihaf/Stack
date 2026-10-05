# Clean Python tool corpus -- 100% passing, boundary-version matrix

28 tool-named folders, one per tool, mirroring the layout of the harvested
`Python Tools` set. Where that set holds each tool's **own upstream test
suite**, this one holds synthetic projects built to the opposite goal: every
tool must run and report **nothing wrong**.

This is the negative control the tool-evaluation corpora do not have. A
family where nothing fires cannot distinguish *correctly detected nothing*
from *the scan never ran*.

## Version coverage: the boundary approach

The team's stated methodology for this corpus's version coverage (Suren's
call, relayed 2026-09-30): rather than one snapshot version per tool, cover
**2 earliest supported versions, 1 middle, 2 end/latest supported versions**.
For Python that is **3.6, 3.7 | 3.11 | 3.13, 3.14** -- placeholder numbers
pending the exact list from the team lead; swapping the numbers later is a
rename of five constants in `_generator/build_multiversion.py`, not a
rebuild.

25 of the 28 tools get the full 5-version treatment, each as an independent
`py3.X/` subfolder inside the tool's own folder:

```text
<Tool>/
  README.md          the 5-version matrix and status for this tool
  py3.6/    py3.7/    py3.11/   py3.13/   py3.14/
    README.md         what clean means here, the command, this version's status
    pyproject.toml    requires-python pinned to this exact version
    src/<package>/    the synthetic project
    tests/            the suite, where the asserts live
```

**diff-cover, dulwich and pydriller are not split by version.** All three read
git history and coverage/diff metadata, never Python source syntax, so a
Python-version axis has nothing to measure for them -- their result cannot
depend on which interpreter wrote the code underneath. They ship as they were
originally built, single-version, with a README note explaining why splitting
them would only manufacture five identical results.

### What "measured" means per version

| Version | How it was verified |
|---|---|
| **3.6** | Code-only. No interpreter exists in the available build environments (`uv`'s python-build-standalone starts at 3.8). Verified instead by `ast.parse(source, feature_version=(3,6))` -- real CPython grammar validation -- and by running every folder's own pytest suite, unmodified, under an available interpreter after the mechanical downgrade described below. Never run against the real tool. |
| **3.7** | Code-only, same reasoning and same two checks, targeting `feature_version=(3,7)`. |
| **3.11** | This corpus's original build. Unchanged: same measured/not-installed results as when it first shipped. |
| **3.13** | Measured for real in this build environment: the actual interpreter and the tool's own current release were both installed and invoked against the folder. |
| **3.14** | Measured for real, interpreter pinned to `3.14.0rc2` (matching this project's convention elsewhere for 3.14). |

### Why 3.6/3.7 needed a source change and 3.11/3.13/3.14 did not

The 3.11 baseline source uses two things with a real floor: builtin generic
subscripting (`list[int]`, `dict[str, X]`, etc. -- needs **3.9+**) and the
stdlib `dataclasses` module / `from __future__ import annotations` (both need
**3.7+**). 3.11, 3.13 and 3.14 all clear both floors, so they reuse the
baseline source **byte-for-byte** -- confirmed nothing in it was removed by
3.12/3.13's own stdlib cleanup (PEP 594, `distutils`, etc.) either.

3.6 and 3.7 do not clear the 3.9 floor, so both needed builtin generics
rewritten to `typing.List`/`typing.Dict`/`typing.Tuple`/etc (27 files,
mechanical, import-safe on any Python 3.6+). 3.6 additionally doesn't clear
the 3.7 floor, so it further needed: the 7 `@dataclass` usages rewritten to
plain classes with an explicit `__init__` (audited: none of the 7 is compared,
hashed, replaced or introspected via `dataclasses.fields`/`asdict`/`replace`
anywhere in the corpus, so a plain class is behavior-preserving -- proved by
running the affected folders' own pytest suites unmodified after the swap,
not assumed), and the 7 `from __future__ import annotations` lines removed
(that pragma itself needs 3.7+).

Deliberately **not** done: downgrading 3.13/3.14's source to the same
`typing.List` style "for consistency." Ruff's own pyupgrade rules (`UP006`/
`UP035`) flag `typing.List` as outdated on a 3.9+ target -- so doing that
would have turned a genuinely clean 3.13/3.14 result into a manufactured
finding.

## Measured result, per version

**3.11 (unchanged from the original build):** 25 measured clean, 0 findings,
3 not invoked (Opengrep, Trivy -- binaries blocked by this environment's
egress proxy; cosmic-ray -- a setuptools `install_layout` incompatibility in
that build environment).

**3.13 (measured in this pass):** **23 measured clean, 0 findings, 2 not
installed** (Opengrep, Trivy -- same binary-egress block). Notably,
**cosmic-ray installed and ran clean here** -- a real environment difference
from the 3.11 result, not a contradiction; see `cosmic-ray/py3.13/README.md`.

**3.14 (measured in this pass, interpreter 3.14.0rc2):** **22 measured clean,
0 findings, 3 not installed** (Opengrep, Trivy, plus **Semgrep**: `semgrep
1.178.0`'s dependency chain pulls in `pydantic 2.13.5` via
`pydantic-settings`, which calls `typing._eval_type(...,
prefer_fwd_module=True)` -- a keyword argument CPython's own `typing` module
changed before 3.14rc2 -- and crashes at import time, before any rule runs.
This is the same root cause already on record elsewhere in this project for
an unrelated Python-version corpus, now independently reproduced here; see
`Semgrep/py3.14/README.md`.

**3.6 / 3.7:** code-only by design (see above) -- not run against a live
tool, so there is no CLEAN/FINDINGS/NOT-INSTALLED tally for them. What ships
is source verified valid by grammar check and by the untouched test suites
passing unmodified after the mechanical downgrade.

## Rules every folder obeys

These hold across the whole tree, so each project is clean for *its* tool
without tripping any of the others, in every version folder:

* **No `assert` in `src/`.** Bandit B101 has no exemption outside tests, so
  the asserts live in `tests/` only.
* **Docstrings on every module, class and function**, and no `# pylint:
  disable` anywhere -- a suppressed message is not a clean result.
* **Cyclomatic complexity <= 5, cognitive complexity well under 15.**
* **Every definition referenced by a test**, so vulture reports no dead code.
* **No dynamic dispatch, star imports, `exec`, metaclasses or
  monkey-patching**, so astroid resolves every name and pyan3 resolves every
  call.
* **No PEP 695 syntax anywhere**, on any version. beniget 0.5.0 has no
  visitor for `gast.TypeVar` and emits one false unbound identifier per *use*
  of a type parameter, at exit 0. Generics use `typing.TypeVar` everywhere,
  which is also what keeps 3.6 in reach.
* **Zero third-party dependencies.** pip-audit and Trivy are clean by
  construction rather than by today's advisory feed.
* **Pure ASCII.** Enforced at write time.
* **A different domain, vocabulary and structural idiom in every folder**, so
  the duplicate detectors find nothing.

## Reproducing

```bash
python3 _generator/build_multiversion.py <output-dir>
# writes the canonical single-version build, then explodes 25 of the 28
# tool folders into py3.6/py3.7/py3.11/py3.13/py3.14 subfolders; leaves
# diff-cover, dulwich and pydriller single-version.
```

Real per-version tool verification (not shipped as a single script yet --
each version needs its own interpreter/venv on PATH):

```bash
python3 -m venv venv3.13 && source venv3.13/bin/activate
pip install bandit gast beniget coverage crosshair-tool lizard radon ruff \
  semgrep slipcover astroid complexipy mutmut pip-audit pyan3 pylint \
  vulture pytest pytest-testmon cosmic-ray
python3 _generator/verify_multiversion.py <output-dir> 3.13 "$(pwd)/venv3.13/bin" -v
```

Exit-code vocabulary, kept deliberately apart: `0` clean, `1` findings, `4`
not installed on this host -- a missing package source must never masquerade
as a clean scan.

## Three folders that could only ever be synthetic

`cognitive-ast`, `Pymcdc` and `sys.settrace driver (stdlib)` are **empty** in
the harvested set: there is no PyPI distribution named `cognitive-ast` at
all, and `sys.settrace` is the standard library. Synthetic data is the only
way those three folders can exist, in every version.

## Tool versions used for the 3.13 / 3.14 measurements

```text
python (interpreter)   3.13.13  /  3.14.0rc2
bandit                  1.9.4
beniget                 0.5.0
gast                    0.7.0
astroid                 4.3.3
coverage                7.16.2
crosshair-tool          0.0.111
lizard                  1.24.0
radon                   6.0.1
ruff                    0.16.9
semgrep                 1.178.0  (crashes on import under 3.14.0rc2 -- see above)
slipcover               1.1.0
complexipy              8.0.1
pylint                  4.1.1
vulture                 2.16
pip-audit (pip_audit)   2.10.1
mutmut                  3.8.0
pyan3                   2.8.1
cosmic-ray (cosmic_ray) 8.7.0
jscpd                   5.3.3   (npm, same across both versions)
pytest                  9.1.1
pytest-testmon          2.2.0
pydantic (transitive, via semgrep)  2.13.5
```

Identical package set resolved on both 3.13 and 3.14 -- so the one 3.14
failure (Semgrep) is attributable to the interpreter, not to a different
dependency resolution.

Tool versions used for the original 3.11 measurement are unchanged; see each
tool's `py3.11/README.md`.

Verified on Linux (build environment for 3.13/3.14; 3.11's original
measurement was Ubuntu 24.04.4 LTS).
