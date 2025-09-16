#!/usr/bin/env bash
# pydriller
set -uo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
. "$REPO_ROOT/tools/_skip.sh"

# --- why this tool has the status it has on this family -------------------
# Python, reads git only. Class C: never touches the source language.

require_python_module pydriller
python3 - <<'PY'
import json, os
from pydriller import Repository
root = os.environ["REPO_ROOT"]
commits, authors = 0, {}
for c in Repository(root).traverse_commits():
    commits += 1
    authors[c.author.name] = authors.get(c.author.name, 0) + 1
    for line in (c.msg or "").splitlines():
        if line.lower().startswith("co-authored-by:"):
            name = line.split(":", 1)[1].split("<")[0].strip()
            authors[name] = authors.get(name, 0) + 1
json.dump({"tool": "pydriller", "commits": commits, "contributors": len(authors),
           "by_author": authors},
          open(os.path.join(root, "reports", "pydriller.json"), "w"), indent=2)
PY
exit 0
