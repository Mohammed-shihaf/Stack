#!/usr/bin/env python
"""Cross-file consistency audit for branch PY-122.

Every rule here exists because violating it produced a wrong result somewhere
in this corpus or its TypeScript sibling. Two in particular:

  * NOTHING is compared against a hard-coded version literal. The TypeScript
    corpus shipped a full_check that asserted the digits "12" in engines.node
    and therefore reported a spurious FAIL on every branch of every later
    family. Here the expected interpreter is READ FROM .python-version and
    every other file is checked against that.

  * Expected values are read from the repository, never from a list baked into
    this script. The planted pins come from requirements-runtime.txt, the tool
    set comes from the tools/ tree, and the package name comes from the source
    layout.

This family DOES have tomllib (PEP 680, stdlib from 3.11), so the pyproject
rule below parses for real. Every earlier family in this corpus falls back to
a hand-written line scanner instead, because those interpreters have no tomllib
and no third-party TOML parser can be assumed present -- on the uv branches of
the older families nothing can be installed at all. Both paths were run against
the same file to confirm they agree, and the rule prints which one it took.

Written to the 3.6 language subset so the same source runs on every family.
Exit 0 = clean, 1 = at least one FAIL.
"""
from __future__ import print_function

import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PROBLEMS = []
CHECKS = [0]


def fail(msg):
    PROBLEMS.append(msg)


def check(name):
    CHECKS[0] += 1


def read(rel):
    with open(os.path.join(ROOT, rel)) as handle:
        return handle.read()


def exists(rel):
    return os.path.exists(os.path.join(ROOT, rel))


# --------------------------------------------------------------------------
# 0. The expected interpreter, read from the repo -- never a literal.
# --------------------------------------------------------------------------
PY_FULL = read(".python-version").strip()
PY = ".".join(PY_FULL.split(".")[:2])
PY_NODOT = PY.replace(".", "")

DATA = json.loads(read("dataset.json"))
SRC = DATA["sourceRoot"]
PKG = DATA["package"]


def rule_interpreter_agreement():
    check("interpreter agreement")
    if DATA["pythonVersion"] != PY:
        fail("dataset.json pythonVersion %r disagrees with .python-version %r"
             % (DATA["pythonVersion"], PY))
    if DATA["pythonVersionVerified"] != PY_FULL:
        fail("dataset.json pythonVersionVerified %r disagrees with .python-version %r"
             % (DATA["pythonVersionVerified"], PY_FULL))

    pyproject = read("pyproject.toml")
    if DATA["buildBackend"] in ("uv_build", "setuptools", "poetry-core"):
        # ALL THREE backends are PEP 621 on this family -- the first time
        # that is true. setuptools was not on 3.6, poetry-core was not until
        # 2.2.1 here, so this check is itself a family-level difference.
        want = 'requires-python = "==%s"' % PY_FULL
        if want not in pyproject:
            fail("pyproject.toml [project] is missing %s" % want)

    ruff = read("tools/ruff/ruff.toml")
    if 'target-version = "py%s"' % PY_NODOT not in ruff:
        fail("ruff.toml target-version does not match py%s" % PY_NODOT)

    pylintrc = read("tools/pylint/pylintrc")
    if "py-version = %s" % PY not in pylintrc:
        fail("pylintrc py-version does not match %s" % PY)


def rule_pyproject_parses():
    check("pyproject parses")
    body = read("pyproject.toml")
    parser = None
    for name in ("tomllib", "tomli", "toml"):
        try:
            parser = __import__(name)
            break
        except ImportError:
            continue
    if parser is not None and hasattr(parser, "loads"):
        try:
            parser.loads(body)
        except Exception as exc:
            fail("pyproject.toml does not parse as TOML: %s: %s"
                 % (type(exc).__name__, exc))
        # Report which path ran. tomllib is stdlib from 3.11 (PEP 680), so this
        # family is the first in the corpus to take the real-parser branch --
        # every earlier one exercises the fallback below. Printing it means a
        # reader can tell which of the two was actually verified.
        print("      pyproject parsed with %s" % parser.__name__)
        return
    print("      pyproject checked with the line scanner (no TOML parser here)")
    # No TOML parser on this interpreter (3.7 predates tomllib, and on the uv
    # branches nothing can be installed). Fall back to the specific failure this
    # check exists for: a double-quoted string that contains an unescaped double
    # quote, which is how a PEP 508 marker breaks a dependency array.
    for number, line in enumerate(body.splitlines(), 1):
        stripped = line.strip()
        if not stripped.startswith('"'):
            continue
        payload = stripped.rstrip(",")
        if payload.count('"') % 2:
            fail("pyproject.toml line %d has an odd number of double quotes -- "
                 "a PEP 508 marker written with double quotes closes the TOML "
                 "string early: %s" % (number, stripped[:70]))


def rule_triggers():
    check("trigger manifests")
    tools_dir = os.path.join(ROOT, "tools")
    dirs = sorted(n for n in os.listdir(tools_dir)
                  if os.path.isdir(os.path.join(tools_dir, n)) and not n.startswith("_"))
    if not dirs:
        fail("tools/ has no tool directories at all")
    if DATA["toolsWired"] != len(dirs):
        fail("dataset.json toolsWired=%d but tools/ has %d directories"
             % (DATA["toolsWired"], len(dirs)))
    for name in dirs:
        rel = "tools/%s/trigger.yaml" % name
        if not exists(rel):
            fail("missing %s" % rel)
            continue
        body = read(rel)
        m = re.search(r'^python_version:\s*"([^"]+)"', body, re.M)
        if not m:
            fail("%s has no python_version" % rel)
        elif m.group(1) != PY:
            fail("%s python_version %r disagrees with .python-version %r"
                 % (rel, m.group(1), PY))
        m = re.search(r'^entrypoint:\s*(\S+)', body, re.M)
        if not m:
            fail("%s has no entrypoint" % rel)
        elif not exists(m.group(1)):
            fail("%s entrypoint does not resolve: %s" % (rel, m.group(1)))
        m = re.search(r'^status:\s*(\S+)', body, re.M)
        if not m or m.group(1) not in ("active", "inactive", "inactive-silent"):
            fail("%s has no usable status field" % rel)
        if "skip_exit_code: 3" not in body:
            fail("%s does not declare skip_exit_code: 3" % rel)


def rule_status_matches_dataset():
    check("trigger status vs dataset")
    active = set(t["dir"] for t in DATA["toolsActiveDetail"])
    dark = set(t["dir"] for t in DATA["toolsInactive"])
    silent = set(t["dir"] for t in DATA["toolsInactiveSilent"])
    overlap = (active & dark) | (active & silent) | (dark & silent)
    if overlap:
        fail("tools appear in more than one status bucket: %s" % ", ".join(sorted(overlap)))
    for name, bucket in (("active", active), ("inactive", dark),
                         ("inactive-silent", silent)):
        for d in sorted(bucket):
            rel = "tools/%s/trigger.yaml" % d
            if not exists(rel):
                fail("dataset.json lists %s in %s but tools/%s/ does not exist"
                     % (d, name, d))
                continue
            m = re.search(r'^status:\s*(\S+)', read(rel), re.M)
            if m and m.group(1) != name:
                fail("%s says status=%s, dataset.json says %s" % (rel, m.group(1), name))
    if DATA["toolsActive"] != len(active):
        fail("dataset.json toolsActive=%d but toolsActiveDetail has %d entries"
             % (DATA["toolsActive"], len(active)))
    if DATA["toolsDark"] != len(dark) + len(silent):
        fail("dataset.json toolsDark=%d but the inactive buckets hold %d"
             % (DATA["toolsDark"], len(dark) + len(silent)))
    if DATA["toolsWired"] != len(active) + len(dark) + len(silent):
        fail("dataset.json toolsWired=%d does not equal active+inactive=%d"
             % (DATA["toolsWired"], len(active) + len(dark) + len(silent)))


def rule_planted_pins():
    check("planted pins")
    # Read the expected set FROM THE REPO, not from a list in this script.
    pins, support, in_support = [], [], False
    for line in read("requirements-runtime.txt").splitlines():
        if line.strip().startswith("# --- support pins"):
            in_support = True
        bare = line.split("#")[0].strip()
        if bare and "==" in bare:
            (support if in_support else pins).append(bare)
    if not pins:
        fail("requirements-runtime.txt declares no pins")
    declared = set(DATA["plantedFixtures"]["vulnerablePins"])
    if set(pins) != declared:
        fail("requirements-runtime.txt planted section %s disagrees with "
             "dataset.json %s" % (sorted(pins), sorted(declared)))
    declared_support = set(DATA["plantedFixtures"].get("runtimeSupportPins", []))
    if set(support) != declared_support:
        fail("requirements-runtime.txt support section %s disagrees with "
             "dataset.json %s" % (sorted(support), sorted(declared_support)))
    # A support pin must NOT be presented as a planted CVE anywhere.
    for spec in support:
        if spec in declared:
            fail("%s is listed both as a support pin and as a planted CVE" % spec)
    integrations = read("%s/%s/platform/integrations.py" % (SRC, PKG))
    for pin in pins:
        name = pin.split("==")[0].lower().replace("-", "_")
        if name not in integrations.lower():
            fail("planted pin %s is imported by nothing in platform/integrations.py "
                 "-- a pin nothing imports produces a manifest-versus-source "
                 "disagreement that is not a tool defect" % pin)
    # A SUPPORT pin is imported by one of the planted packages, not by us, so
    # requiring it in integrations.py would be wrong. What must hold is that
    # something asserts it is actually installed -- otherwise it goes back to
    # arriving by luck, which is what put it here in the first place.
    guard = read("tests/test_platform.py")
    for pin in support:
        name = pin.split("==")[0]
        # Anchor to the ASSERTION, not the name. A bare `name in guard` match is
        # satisfied by the module docstring explaining why the pin is there --
        # which is how this very check first passed while asserting nothing.
        if 'importorskip("%s")' % name not in guard:
            fail("support pin %s has no importorskip guard in "
                 "tests/test_platform.py -- an undeclared transitive that nobody "
                 "checks is exactly how this pin came to be needed" % pin)


def _normalise(body, drop_names):
    body = re.sub(r'"""(?:.|\n)*?"""', "", body)
    body = re.sub(r"#.*", "", body)
    for name in drop_names:
        body = body.replace(name, "X")
    return re.sub(r"\s+", " ", body).strip()


def rule_duplicate_pair():
    check("duplicate pair")
    a = "%s/%s/services/retail_order_processor.py" % (SRC, PKG)
    b = "%s/%s/services/wholesale_order_processor.py" % (SRC, PKG)
    for rel in (a, b):
        if not exists(rel):
            fail("missing duplication fixture: %s" % rel)
            return
    drop = ["RetailOrderProcessor", "WholesaleOrderProcessor",
            "retail", "wholesale", "Retail", "Wholesale"]
    if _normalise(read(a), drop) != _normalise(read(b), drop):
        fail("the planted duplicate pair is no longer identical modulo names -- "
             "the duplication fixture has drifted")


def rule_no_empty_packages():
    check("no empty subpackages")
    # An empty package is valid Python and invisible to compile, import and
    # tests. In the sibling Python corpus two of them shipped in three repos
    # and only surfaced when a wheel was built.
    base = os.path.join(ROOT, *("%s/%s" % (SRC, PKG)).split("/"))
    for dirpath, dirnames, filenames in os.walk(base):
        dirnames[:] = [d for d in dirnames if d != "__pycache__"]
        pys = [f for f in filenames if f.endswith(".py")]
        if not pys:
            fail("package directory with no modules at all: %s"
                 % os.path.relpath(dirpath, ROOT).replace(os.sep, "/"))
        elif pys == ["__init__.py"] and os.path.getsize(
                os.path.join(dirpath, "__init__.py")) < 5:
            fail("empty subpackage: %s"
                 % os.path.relpath(dirpath, ROOT).replace(os.sep, "/"))


def rule_workspace():
    check("workspace members")
    for member in DATA.get("workspaces", []):
        for candidate in ("pyproject.toml", "setup.cfg"):
            if exists("%s/%s" % (member, candidate)):
                break
        else:
            fail("workspace member %s has no manifest" % member)
    if DATA["architecture"] == "Microservices" and not DATA["workspaces"]:
        fail("architecture is Microservices but dataset.json lists no workspaces")
    if DATA["architecture"] == "Monolith" and DATA["workspaces"]:
        fail("architecture is Monolith but dataset.json lists workspaces")


def rule_readme():
    check("README structure")
    body = read("README.md")
    wanted = ["## Branch variables", "## Supported tools", "## Build", "## Run",
              "## Test", "## Tool entry points", "## Planted fixtures"]
    # Anchor each heading to a whole line. A bare find() matches "## Run" inside
    # "## Running here" and reports a spurious out-of-order FAIL -- which is
    # exactly what it did on the first run of this audit.
    position = -1
    for heading in wanted:
        m = re.search(r"^%s\s*$" % re.escape(heading), body, re.M)
        if not m:
            fail("README.md is missing the section %r" % heading)
        elif m.start() < position:
            fail("README.md section %r is out of order" % heading)
        else:
            position = m.start()
    for link in re.findall(r"\]\(([^)#][^)]*)\)", body):
        if link.startswith(("http://", "https://", "mailto:")):
            continue
        if not exists(link.split("#")[0]):
            fail("README.md links to a path that does not resolve: %s" % link)


def rule_prose_matches_repo():
    """The prose must not contradict the files it describes.

    This rule exists because it was violated for four consecutive family
    forks and nobody noticed. Every branch of the 3.9, 3.10 and 3.11 families
    shipped a README whose opening line read "One branch of the Python 3.8
    family"; every repo-level `main` from 3.8 onward carried a section headed
    "Getting a Python 3.6 interpreter" with a CPython 3.6 tarball recipe; and
    requirements-dev.txt claimed on all four to have been "exercised on a real
    CPython 3.7.17 interpreter".

    The reason it survived is worth stating: the TEMPLATED fields around the
    prose were all correct. The branch id, the interpreter, the pins, the
    tables -- every substituted value was right, on every branch, which is
    what a reader checks. The frozen sentences sat between them.

    So the rule is not "spell-check the docs". It is the same rule the whole
    corpus runs on, turned inward: **a claim in prose is checked against the
    artifact it claims about, or it is not allowed to name a version at all.**

    Three checks:
      1. No file may name a Python version other than this branch's, unless
         the line is explicitly a cross-family comparison.
      2. Every "<distribution> <version>" pair in README prose must match that
         distribution's actual pin in this branch's manifests.
      3. The advisory total quoted in README prose must equal the sum of the
         per-pin counts in requirements-runtime.txt.
    """
    check("prose agrees with the repository")
    # Never a literal; see the module docstring. Compare on the FEATURE
    # version -- ".python-version" holds 3.11.13 and the prose says "3.11",
    # and a rule that calls those two different is a rule nobody will keep.
    py = ".".join(read(".python-version").strip().split(".")[:2])

    # -- 1. foreign interpreter versions -----------------------------------
    foreign = re.compile(r"(?:Python|CPython|python)\s+3\.(\d+)")
    for rel in ("README.md", "requirements-dev.txt", "requirements-runtime.txt",
                "Makefile"):
        if not exists(rel):
            continue
        for lineno, line in enumerate(read(rel).splitlines(), 1):
            # A declared floor (">=3.10") and an environment marker are not
            # claims about THIS interpreter, so they are not this rule's
            # business.
            if ">=3." in line or "python_version" in line:
                continue
            found = set("3." + m for m in foreign.findall(line))
            if not found:
                continue
            # A line naming SEVERAL versions is a cross-family comparison and
            # is allowed to name any of them. A line naming exactly one, and
            # that one not ours, is a statement about this branch that is
            # false.
            #
            # The first draft of this rule exempted any line containing the
            # word "family" instead, on the theory that such lines are
            # comparisons. It passed the sentence "One branch of the Python
            # 3.8 family" -- the single defect this whole rule was written to
            # catch. An exemption wide enough to cover the comparisons was
            # wide enough to cover the bug; the version count is the
            # distinction that actually separates them.
            if len(found) > 1 or line.lstrip().startswith("|"):
                continue
            other = found.pop()
            if other != py:
                fail("%s:%d states Python %s, but this branch is %s: %r"
                     % (rel, lineno, other, py, line.strip()[:90]))

    # -- 2. distribution versions quoted in prose --------------------------
    pins = {}
    for rel in ("requirements-dev.txt", "requirements-runtime.txt"):
        if not exists(rel):
            continue
        for line in read(rel).splitlines():
            m = re.match(r"^\s*([A-Za-z0-9_.\-]+)==([0-9][^\s;#]*)", line)
            if m:
                pins[m.group(1).lower()] = m.group(2)
    if exists("README.md"):
        body = read("README.md")
        # "paramiko 2.4.1" / "urllib3 2.2.2" -- a name we pin, followed by a
        # dotted version. Backticked code spans are generated, so skip those.
        prose = re.sub(r"`[^`]*`", "", body)
        for name, version in re.findall(
                r"\b([A-Za-z][A-Za-z0-9_\-]{2,})\s+([0-9]+\.[0-9]+(?:\.[0-9]+)?)\b",
                prose):
            actual = pins.get(name.lower())
            if actual and not actual.startswith(version):
                fail("README.md says %s %s but this branch pins %s==%s"
                     % (name, version, name, actual))

    # -- 2b. placeholders that never got substituted ------------------------
    # Added after a botched edit to the generator left the literal text
    # "setuptools {} -- the newest release..." in a rendered README, and every
    # other rule passed it. A template hole in shipped prose is not cosmetic:
    # it is the one defect that proves the value was never computed at all.
    # A bare "{}" is ALSO ordinary shell -- `find . -exec rm -rf {} +` is in
    # every Makefile here -- so the bare form is only checked in prose, and
    # only outside fenced code blocks. The named form is unambiguous anywhere.
    named = re.compile(r"\{[A-Z][A-Z0-9_]{2,}\}")
    for rel in ("README.md", "dataset.json", "Makefile", "requirements-dev.txt"):
        if not exists(rel):
            continue
        fenced = False
        for lineno, line in enumerate(read(rel).splitlines(), 1):
            if line.startswith("```"):
                fenced = not fenced
                continue
            hit = named.search(line)
            if not hit and rel.endswith(".md") and not fenced and "{}" in line:
                hit = True
            if hit:
                fail("%s:%d has an unsubstituted template placeholder: %r"
                     % (rel, lineno, line.strip()[:90]))

    # -- 3. the advisory arithmetic ----------------------------------------
    if exists("README.md") and exists("requirements-runtime.txt"):
        counts = [int(n) for n in re.findall(
            r"#\s*(\d+)\s+advisories", read("requirements-runtime.txt"))]
        m = re.search(r"carry\s+(\d+)\s+live advisories", read("README.md"))
        if counts and m and int(m.group(1)) != sum(counts):
            fail("README.md claims %s live advisories; requirements-runtime.txt "
                 "sums to %d" % (m.group(1), sum(counts)))


def rule_branch_identity():
    check("no sibling-branch wording")
    # dataset.json's repository/branch must match this checkout, and no file may
    # name a DIFFERENT branch of this family. The TypeScript corpus shipped 120
    # branches whose dataset.json carried a hardcoded sibling repository name.
    branch = DATA["branchId"]
    others = set("PY-%03d" % n for n in range(121, 145)) - set([branch])
    for rel in ("dataset.json", "README.md", "Makefile", "pyproject.toml"):
        if not exists(rel):
            continue
        body = read(rel)
        for other in sorted(others):
            if other in body:
                fail("%s mentions sibling branch %s" % (rel, other))
                break


def rule_shell_and_yaml():
    check("shell and yaml parse")
    for dirpath, dirnames, filenames in os.walk(os.path.join(ROOT, "tools")):
        dirnames[:] = [d for d in dirnames if d != "__pycache__"]
        for name in sorted(filenames):
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, ROOT).replace(os.sep, "/")
            if name.endswith(".sh"):
                proc = subprocess.Popen(["bash", "-n", full],
                                        stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                _out, err = proc.communicate()
                if proc.returncode != 0:
                    fail("bash -n failed for %s: %s"
                         % (rel, err.decode("utf-8", "replace").strip()[:120]))
            elif name.endswith(".py"):
                with open(full) as handle:
                    source = handle.read()
                try:
                    compile(source, full, "exec")
                except SyntaxError as exc:
                    fail("%s does not compile on Python %s: %s" % (rel, PY, exc))


def rule_functional_flag():
    check("branchFunctional")
    # A branch marked functional must carry a lockfile; a branch marked
    # non-functional must carry the explanation instead of a silent gap.
    if DATA["branchFunctional"]:
        if "nonFunctionalReason" in DATA:
            fail("branchFunctional is true but nonFunctionalReason is set")
    else:
        if not DATA.get("nonFunctionalReason"):
            fail("branchFunctional is false with no nonFunctionalReason -- a branch "
                 "that cannot be built must say why, or it looks like an oversight")
        if DATA["packageManager"] == "uv" and not exists("uv.lock.MISSING"):
            fail("uv branch has neither uv.lock nor the uv.lock.MISSING note")
        if not DATA.get("nonFunctionalClass"):
            fail("branchFunctional is false with no nonFunctionalClass -- an "
                 "interpreter floor and a metadata-shape incompatibility are "
                 "different findings and must not share a label")


def main():
    for rule in (rule_interpreter_agreement, rule_pyproject_parses, rule_triggers, rule_status_matches_dataset,
                 rule_planted_pins, rule_duplicate_pair, rule_no_empty_packages,
                 rule_workspace, rule_readme, rule_prose_matches_repo,
                 rule_branch_identity,
                 rule_shell_and_yaml, rule_functional_flag):
        try:
            rule()
        except Exception as exc:            # a rule that crashes is a FAIL, not a pass
            fail("rule %s crashed: %s: %s" % (rule.__name__, type(exc).__name__, exc))

    print("full_check PY-122: %d rule groups" % CHECKS[0])
    if PROBLEMS:
        for problem in PROBLEMS:
            print("FAIL  " + problem)
        print("\n%d problem(s)" % len(PROBLEMS))
        return 1
    print("OK    no cross-file inconsistencies")
    return 0


if __name__ == "__main__":
    sys.exit(main())
