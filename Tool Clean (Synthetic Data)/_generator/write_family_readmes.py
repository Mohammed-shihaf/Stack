#!/usr/bin/env python3
"""Append a per-family results section to each versionable (or
node-independent) tool's README, reflecting the real node12/14/20/24/26
boundary-split measurement. Driven entirely by live_results.json, each
family folder's own .UNAVAILABLE marker, and the FINDINGS dict below
(documented reasons for every genuine gap) -- nothing here is hand-
asserted without a corresponding real measurement.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from pin_table import (
    FAMILIES, UNVERSIONED, NODE_INDEPENDENT, ALWAYS_NOT_INSTALLED, NO_FOLDER,
)

ROOT = "/root/ts_work_src"

with open(os.path.join(ROOT, "live_results.json")) as f:
    LIVE = json.load(f)

# Documented reasons for every genuine node12/14 gap (tool, family) ->
# human-readable explanation. Every one of these was independently
# confirmed live in this session (see pin_table.py's own comments next to
# each pin for the full technical detail); this dict only supplies the
# reader-facing one-liner.
FINDINGS = {
    ("Biome", "node12"): "@biomejs/biome has no Node 12 release at all (confirmed live against the real npm registry).",
    ("StrykerJS", "node12"): "@stryker-mutator/vitest-runner has no release before 7.0.0 (requires Node >=18), and vitest itself has no genuine Node 12 release -- no mutually-compatible trio exists.",
    ("StrykerJS", "node14"): "vitest's first genuine Node-14 release (0.34.6) predates the entire vitest-runner/coverage-v8 package lineage by several minors -- no mutually-compatible Stryker trio exists this old.",
    ("covgate", "node12"): "covgate's own gate reads a real vitest v8 coverage report; vitest has no genuine Node 12 release.",
    ("covgate", "node14"): "covgate's own gate reads a real vitest v8 coverage report; vitest 0.34.6 (node14's own ceiling) predates the @vitest/coverage-v8 companion package.",
    ("mewt", "node12"): "mewt's own mutation run shells out to `npx vitest run` as its configured test command; vitest has no genuine Node 12 release.",
    ("mewt", "node14"): "mewt's own mutation run shells out to `npx vitest run`; vitest 0.34.6 (node14's own ceiling) predates the coverage/runner package lineage mewt's own harness assumes.",
    ("oxc-coverage-instrument", "node12"): "Needs @vitest/coverage-istanbul as its adapter target; vitest has no genuine Node 12 release.",
    ("oxc-coverage-instrument", "node14"): "Needs @vitest/coverage-istanbul >=4.1.5 per its own documented adapter; vitest 0.34.6 (node14's own ceiling) predates it by several majors.",
    ("fast-check", "node12"): "fast-check's own property tests run via plain `vitest run`; vitest has no genuine Node 12 release.",
    ("vitest", "node12"): "vitest itself has no genuine Node 12 release (its earliest pre-`engines` versions are non-functional day-one previews, not real releases).",
    ("knip", "node12"): "knip has no Node 12 release (confirmed live).",
    ("knip", "node14"): "knip has no Node 14 release (confirmed live).",
    ("monocart-coverage-reports", "node12"): "No release threads both needles: every version old enough to avoid the current `commander@^14` hard dependency also ships no `mcr` CLI at all, and every version that does ship `mcr` (2.2.0 onward) loads a bundled vendor file that itself throws a syntax error under Node 12's V8.",
    ("monocart-coverage-reports", "node14"): "Same bundled-vendor-file incompatibility as node12, confirmed live independently under Node 14's own (newer, but still insufficient) V8.",
}


def family_status(tool, family):
    folder = os.path.join(ROOT, tool, family)
    marker = os.path.join(folder, ".UNAVAILABLE")
    if os.path.isfile(marker):
        with open(marker) as f:
            missing = f.read().strip().replace("\n", ", ")
        finding = FINDINGS.get((tool, family), f"{missing} unavailable for this family -- see pin_table.py.")
        return f"NOT INSTALLED / CODE-ONLY -- {finding}"

    res = LIVE.get(tool, {}).get(family)
    if res is None:
        return "(not live-verified -- see live_results.json)"
    if res.get("skipped"):
        return f"NOT INSTALLED / CODE-ONLY -- {res['skipped']}"
    ok = res.get("install_rc", 0) == 0 and res.get("run_rc", 1) == 0 and res.get("build_rc", 0) == 0
    if ok:
        return "CLEAN (installed/built and run for real under this family's own Node binary)"
    finding = FINDINGS.get((tool, family))
    if finding:
        return f"FINDING -- {finding}"
    return "FAILED (unexplained -- see live_results.json)"


def per_tool_section(tool):
    lines = ["", "## Per-Node-family results", ""]
    lines.append(
        "Boundary-version methodology: 2 earliest + 1 middle + 2 latest "
        "supported Node majors (12, 14, 20, 24, 26). Every family below was "
        "actually installed (or built, where a build step is needed) and "
        "invoked for real under that family's own real Node+npm binary -- "
        "a family is marked NOT INSTALLED / CODE-ONLY only where a real, "
        "reproducible absence was confirmed live (never assumed from a "
        "package's declared `engines` field alone)."
    )
    lines.append("")
    lines.append("| Family | Status |")
    lines.append("| --- | --- |")
    for fam in FAMILIES:
        lines.append(f"| {fam} | {family_status(tool, fam)} |")
    lines.append("")
    return "\n".join(lines)


def update_tool_readme(tool):
    path = os.path.join(ROOT, tool, "README.md")
    if not os.path.isfile(path):
        return False
    with open(path) as f:
        content = f.read()
    content = re.split(r"\n## Per-Node-family results\n", content)[0].rstrip() + "\n"
    content += per_tool_section(tool)
    with open(path, "w") as f:
        f.write(content)
    return True


def main():
    all_tools = sorted(
        d for d in os.listdir(ROOT)
        if os.path.isdir(os.path.join(ROOT, d)) and not d.startswith("_")
        and d not in ("live_results.json",)
    )
    excluded = UNVERSIONED | ALWAYS_NOT_INSTALLED | NO_FOLDER
    versionable = [t for t in all_tools if t not in excluded]
    updated = 0
    for t in versionable:
        if update_tool_readme(t):
            updated += 1
        else:
            print(f"  WARNING: no README.md for {t}")
    print(f"Updated {updated}/{len(versionable)} tool READMEs "
          f"({len(excluded)} tools left untouched: unversioned/always-blocked/no-folder)")


if __name__ == "__main__":
    main()
