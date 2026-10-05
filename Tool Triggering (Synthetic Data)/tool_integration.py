#!/usr/bin/env python
"""Tool integration entry point for branch PY-122.

  python tools/tool_integration.py            banner
  python tools/tool_integration.py --verify   check every tool is wired
  python tools/tool_integration.py --run      run every tool, honouring skips

Exit codes from a --run mirror the runners' own contract:

  0  every tool either ran, or skipped for a reason dataset.json records
  1  a tool recorded ACTIVE could not run because it is missing from this host
  2  a tool skipped for a reason dataset.json does NOT record

Those last two are different problems and must not share a code. Exit 1 is a
setup gap on this machine -- install the binary. Exit 2 is a tool going dark for
a NEW reason, which is a finding about the branch. A tool going dark for the
reason already written down is neither: it is the measurement.

Written 3.6-clean.
"""
from __future__ import print_function

import argparse
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS_DIR = os.path.join(ROOT, "tools")

WIRING = [
    {"dir": "crosshair", "label": "CrossHair", "role": "primary",
     "entrypoint": "tools/crosshair/run_crosshair.sh", "status": "active"},
    {"dir": "coverage", "label": "Coverage.py", "role": "primary",
     "entrypoint": "tools/coverage/run_coverage.sh", "status": "active"},
    {"dir": "pymcdc", "label": "Pymcdc", "role": "primary",
     "entrypoint": "tools/pymcdc/run_pymcdc.sh", "status": "active"},
    {"dir": "radon", "label": "Radon", "role": "primary",
     "entrypoint": "tools/radon/run_radon.sh", "status": "active"},
    {"dir": "lizard", "label": "Lizard", "role": "primary",
     "entrypoint": "tools/lizard/run_lizard.sh", "status": "active"},
    {"dir": "testmon", "label": "testmon", "role": "primary",
     "entrypoint": "tools/testmon/run_testmon.sh", "status": "active"},
    {"dir": "cognitive-ast", "label": "cognitive-ast", "role": "primary",
     "entrypoint": "tools/cognitive-ast/run_cognitive_ast.py", "status": "active"},
    {"dir": "jscpd", "label": "jscpd", "role": "primary",
     "entrypoint": "tools/jscpd/run_jscpd.sh", "status": "active"},
    {"dir": "pylint", "label": "pylint", "role": "primary",
     "entrypoint": "tools/pylint/run_pylint.sh", "status": "active"},
    {"dir": "semgrep", "label": "Semgrep OSS", "role": "primary",
     "entrypoint": "tools/semgrep/run_semgrep.sh", "status": "active"},
    {"dir": "bandit", "label": "Bandit", "role": "primary",
     "entrypoint": "tools/bandit/run_bandit.sh", "status": "active"},
    {"dir": "pip-audit", "label": "pip-audit", "role": "primary",
     "entrypoint": "tools/pip-audit/run_pip_audit.sh", "status": "active"},
    {"dir": "cosmic-ray", "label": "cosmic-ray", "role": "primary",
     "entrypoint": "tools/cosmic-ray/run_cosmic_ray.sh", "status": "active"},
    {"dir": "beniget", "label": "Beniget", "role": "primary",
     "entrypoint": "tools/beniget/run_beniget.py", "status": "active"},
    {"dir": "pydriller", "label": "PyDriller", "role": "primary",
     "entrypoint": "tools/pydriller/run_pydriller.py", "status": "active"},
    {"dir": "ruff", "label": "Ruff", "role": "alternative",
     "entrypoint": "tools/ruff/run_ruff.sh", "status": "active"},
    {"dir": "complexipy", "label": "complexipy", "role": "alternative",
     "entrypoint": "tools/complexipy/run_complexipy.sh", "status": "active"},
    {"dir": "symilar", "label": "symilar (pylint)", "role": "alternative",
     "entrypoint": "tools/symilar/run_symilar.sh", "status": "active"},
    {"dir": "opengrep", "label": "Opengrep", "role": "alternative",
     "entrypoint": "tools/opengrep/run_opengrep.sh", "status": "active"},
    {"dir": "opengrep-taint", "label": "Opengrep (taint mode)", "role": "alternative",
     "entrypoint": "tools/opengrep-taint/run_opengrep_taint.sh", "status": "active"},
    {"dir": "trivy", "label": "Trivy", "role": "alternative",
     "entrypoint": "tools/trivy/run_trivy.sh", "status": "active"},
    {"dir": "slipcover", "label": "SlipCover", "role": "alternative",
     "entrypoint": "tools/slipcover/run_slipcover.sh", "status": "active"},
    {"dir": "mutmut", "label": "mutmut", "role": "alternative",
     "entrypoint": "tools/mutmut/run_mutmut.sh", "status": "active"},
    {"dir": "diff-cover", "label": "diff-cover", "role": "alternative",
     "entrypoint": "tools/diff-cover/run_diff_cover.sh", "status": "active"},
    {"dir": "astroid", "label": "astroid", "role": "alternative",
     "entrypoint": "tools/astroid/run_astroid.py", "status": "active"},
    {"dir": "pyan3", "label": "pyan3 + astroid", "role": "alternative",
     "entrypoint": "tools/pyan3/run_pyan3.sh", "status": "active"},
    {"dir": "vulture", "label": "pylint + vulture", "role": "alternative",
     "entrypoint": "tools/vulture/run_vulture.sh", "status": "active"},
    {"dir": "dulwich", "label": "dulwich", "role": "alternative",
     "entrypoint": "tools/dulwich/run_dulwich.py", "status": "active"},
    {"dir": "settrace", "label": "sys.settrace driver (stdlib)", "role": "alternative",
     "entrypoint": "tools/settrace/run_settrace.py", "status": "active"},
]


def load_dataset():
    with open(os.path.join(ROOT, "dataset.json")) as handle:
        return json.load(handle)


def banner():
    data = load_dataset()
    print("=" * 78)
    print("  PY-122  --  Microservices  --  Python 3.11 (3.11.13)")
    print("=" * 78)
    print("  build backend  : setuptools 84.0.0   (pyproject [project])")
    print("  package manager: pip 26.2.1")
    print("  source root    : packages/domain/src")
    print("  test runner    : " + data["testRunner"])
    print("-" * 78)
    print("  tools wired    : %d" % data["toolsWired"])
    print("  active here    : %d" % data["toolsActive"])
    print("  dark here      : %d  (declared on purpose; see toolsInactive)"
          % data["toolsDark"])
    print("  branch usable  : %s" % ("yes" if data["branchFunctional"] else
                                     "NO -- " + data.get("nonFunctionalReason", "")[:60]))
    print("=" * 78)


def verify():
    data = load_dataset()
    problems = []
    for row in WIRING:
        folder = os.path.join(TOOLS_DIR, row["dir"])
        if not os.path.isdir(folder):
            problems.append("missing directory: tools/%s" % row["dir"])
            continue
        manifest = os.path.join(folder, "trigger.yaml")
        if not os.path.isfile(manifest):
            problems.append("missing manifest: tools/%s/trigger.yaml" % row["dir"])
        entry = os.path.join(ROOT, row["entrypoint"])
        if not os.path.isfile(entry):
            problems.append("missing entrypoint: %s" % row["entrypoint"])

    declared = set(r["dir"] for r in WIRING)
    present = set(n for n in os.listdir(TOOLS_DIR)
                  if os.path.isdir(os.path.join(TOOLS_DIR, n)) and not n.startswith("_"))
    for extra in sorted(present - declared):
        problems.append("orphan tool directory with no wiring row: tools/%s" % extra)
    for missing in sorted(declared - present):
        problems.append("wiring row with no directory: tools/%s" % missing)

    if data["toolsWired"] != len(WIRING):
        problems.append("dataset.json says %d tools wired, wiring table has %d"
                        % (data["toolsWired"], len(WIRING)))

    if problems:
        for p in problems:
            print("FAIL  " + p)
        return 1
    print("OK    %d tools wired, every manifest and entrypoint present" % len(WIRING))
    return 0


def run_all():
    data = load_dataset()
    expected_active = set(t["dir"] for t in data["toolsActiveDetail"])
    expected_dark = set(t["dir"] for t in data["toolsInactive"]) | \
        set(t["dir"] for t in data["toolsInactiveSilent"])

    ran, skipped, absent, failed, unexpected = [], [], [], [], []
    for row in WIRING:
        entry = os.path.join(ROOT, row["entrypoint"])
        cmd = ([sys.executable, entry] if entry.endswith(".py")
               else ["bash", entry])
        print("\n--- %s (%s) ---" % (row["label"], row["dir"]))
        proc = subprocess.Popen(cmd, cwd=ROOT)
        proc.communicate()
        rc = proc.returncode
        if rc == 3:
            skipped.append(row["dir"])
            if row["dir"] not in expected_dark:
                unexpected.append(row["dir"])
        elif rc == 4:
            absent.append(row["dir"])
        elif rc == 0:
            ran.append(row["dir"])
        else:
            failed.append(row["dir"])

    print("\n" + "=" * 78)
    print("  ran           : %2d  %s" % (len(ran), " ".join(sorted(ran))))
    print("  skipped (3)   : %2d  %s" % (len(skipped), " ".join(sorted(skipped))))
    print("  not installed : %2d  %s" % (len(absent), " ".join(sorted(absent))))
    print("  failed        : %2d  %s" % (len(failed), " ".join(sorted(failed))))
    print("=" * 78)
    print("  skipped   = cannot run on Python 3.11. Recorded in dataset.json. The measurement.")
    print("  not installed = a standalone binary absent from THIS host. A setup gap.")

    if failed:
        print("FAIL  these tools ran and failed: %s" % " ".join(sorted(failed)))
        return 1
    if absent:
        print("INCOMPLETE  these tools are recorded ACTIVE but are not installed here: %s"
              % " ".join(sorted(absent)))
        print("            See tools/<name>/INSTALL.md. Not a Python 3.11 finding.")
        return 1
    missing_active = sorted(expected_active - set(ran))
    if missing_active:
        print("FAIL  recorded ACTIVE but did not run: %s" % " ".join(missing_active))
        return 1
    if unexpected:
        print("FAIL  these tools skipped for a reason dataset.json does not record: %s"
              % " ".join(sorted(unexpected)))
        print("      That is a NEW finding, not the expected measurement. Investigate")
        print("      before updating dataset.json.")
        return 2
    print("OK    every active tool ran; every skip was already recorded")
    return 0


def main():
    parser = argparse.ArgumentParser(description="Tool integration for PY-122")
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--run", action="store_true")
    args = parser.parse_args()
    if args.verify:
        return verify()
    if args.run:
        return run_all()
    banner()
    return 0


if __name__ == "__main__":
    sys.exit(main())
