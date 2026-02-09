#!/usr/bin/env python
"""dulwich history mining -- the cross-check on PyDriller. DARK on Python 3.6."""
from __future__ import print_function

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Order matters. The INTERPRETER check comes first: a tool that cannot run here
# is SKIPPED (3), which is a family finding. Reporting it as NOT INSTALLED (4)
# would misattribute that finding to a host gap.
try:
    from dulwich.repo import Repo
except ImportError as exc:
    print("STATUS: SKIPPED")
    print("  tool        : dulwich")
    print("  pin         : dulwich==1.2.14")
    print("  declares    : Requires-Python >=3.10")
    print("  interpreter : Python %d.%d" % sys.version_info[:2])
    print("  import error: %s" % exc)
    sys.exit(3)

if not os.path.isdir(os.path.join(ROOT, ".git")):
    print("STATUS: NOT INSTALLED")
    print("  tool   : dulwich")
    print("  reason : %s is not a git repository, and this tool mines history."
          % ROOT)
    sys.exit(4)


def main():
    repo = Repo(ROOT)
    authors = {}
    total = 0
    for entry in repo.get_walker():
        total += 1
        message = entry.commit.message.decode("utf-8", "replace")
        who = entry.commit.author.decode("utf-8", "replace").split("<")[0].strip()
        authors[who] = authors.get(who, 0) + 1
        for line in message.splitlines():
            if line.lower().startswith("co-authored-by:"):
                name = line.split(":", 1)[1].split("<")[0].strip()
                authors[name] = authors.get(name, 0) + 1
    report = {"tool": "dulwich", "commits": total, "authors": authors}
    outdir = os.path.join(ROOT, "reports")
    if not os.path.isdir(outdir):
        os.makedirs(outdir)
    with open(os.path.join(outdir, "dulwich.json"), "w") as handle:
        json.dump(report, handle, indent=2, sort_keys=True)
    print("dulwich: %d commits, %d contributors" % (total, len(authors)))
    return 0 if len(authors) > 1 else 1


if __name__ == "__main__":
    sys.exit(main())
