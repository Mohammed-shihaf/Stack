#!/usr/bin/env python
"""Beniget def-use chains over the domain and the taint fixture.

One of exactly two PyPI tools in the roster whose latest release actually runs
on Python 3.6 -- and, unlike lizard and pydriller, its declared >=3.6 is true.
"""
from __future__ import print_function

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, *"packages/domain/src".split("/"))
PKG = "orderlab"

try:
    import gast
    import beniget
except ImportError as exc:
    print("STATUS: SKIPPED")
    print("  tool        : beniget")
    print("  import error: %s" % exc)
    sys.exit(3)

TARGETS = [
    "services/pricing_rules.py",
    "services/order_service.py",
    "analysis/taint_fixture.py",
    "analysis/call_graph_sample.py",
]


def analyse(rel):
    path = os.path.join(SRC, PKG, *rel.split("/"))
    with open(path) as handle:
        source = handle.read()
    tree = gast.parse(source)
    chains = beniget.DefUseChains()
    chains.visit(tree)
    beniget.UseDefChains(chains)

    defs = []
    for node, definition in chains.chains.items():
        name = getattr(definition, "name", lambda: None)()
        if not name:
            continue
        defs.append({
            "name": name,
            "line": getattr(node, "lineno", None),
            "uses": len(definition.users()),
        })
    unused = [d for d in defs if d["uses"] == 0 and d["line"]]
    return {
        "file": "%s/%s" % (PKG, rel),
        "definitions": len(defs),
        "unused_definitions": len(unused),
        "sample_unused": sorted(unused, key=lambda d: d["line"])[:6],
    }


def main():
    rows = [analyse(rel) for rel in TARGETS]
    report = {
        "tool": "Beniget",
        "interpreter": "%d.%d.%d" % sys.version_info[:3],
        "beniget": getattr(beniget, "__version__", "unknown"),
        "files": rows,
        "total_definitions": sum(r["definitions"] for r in rows),
    }
    outdir = os.path.join(ROOT, "reports")
    if not os.path.isdir(outdir):
        os.makedirs(outdir)
    with open(os.path.join(outdir, "beniget.json"), "w") as handle:
        json.dump(report, handle, indent=2, sort_keys=True)
    for row in rows:
        print("  %-42s %3d definitions, %2d unused"
              % (row["file"], row["definitions"], row["unused_definitions"]))
    if report["total_definitions"] == 0:
        print("WARNING: zero definitions found -- beniget did not parse the sources.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
