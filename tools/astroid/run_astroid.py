#!/usr/bin/env python
"""astroid inference over the call-graph fixture.

Pinned at 4.0.4 rather than the latest 4.3.1: pylint 4.0.8 requires
astroid<=4.1.dev0, and the two cannot be co-installed. The only place in
this corpus where "latest everywhere" yields to a peer range.
"""
from __future__ import print_function

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, *"src".split("/"))
PKG = "orderlab"

try:
    import astroid
except ImportError as exc:
    print("STATUS: SKIPPED")
    print("  tool        : astroid")
    print("  pin         : astroid==4.0.4")
    print("  declares    : Requires-Python >=3.10.0")
    print("  interpreter : Python %d.%d" % sys.version_info[:2])
    print("  import error: %s" % exc)
    sys.exit(3)


def main():
    path = os.path.join(SRC, PKG, "analysis", "call_graph_sample.py")
    with open(path) as handle:
        module = astroid.parse(handle.read(), path=path)
    edges = []
    for func in module.nodes_of_class(astroid.FunctionDef):
        for call in func.nodes_of_class(astroid.Call):
            name = getattr(call.func, "name", None)
            if name:
                edges.append([func.name, name])
    report = {"tool": "astroid", "edges": edges, "edge_count": len(edges)}
    outdir = os.path.join(ROOT, "reports")
    if not os.path.isdir(outdir):
        os.makedirs(outdir)
    with open(os.path.join(outdir, "astroid.json"), "w") as handle:
        json.dump(report, handle, indent=2, sort_keys=True)
    print("astroid: %d call edges" % len(edges))
    return 0 if edges else 1


if __name__ == "__main__":
    sys.exit(main())
