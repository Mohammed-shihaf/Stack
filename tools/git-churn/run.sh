#!/usr/bin/env bash
# git-churn
set -uo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
. "$REPO_ROOT/tools/_skip.sh"

# --- why this tool has the status it has on this family -------------------
# stdlib git. Class C. Counts Co-authored-by trailers, not just the author field -- the TypeScript corpus's ownership metric was wrong, not missing, for exactly this reason.

require_cmd git
# Counts Co-authored-by trailers, not just the author field. The TypeScript corpus
# shipped an ownership metric that was WRONG rather than missing because its parser
# split each record on the first newline and never saw the trailers.
python3 - <<'PY'
import collections, json, os, subprocess
root = os.environ["REPO_ROOT"]
sep = "\x1e"
log = subprocess.check_output(
    ["git", "-C", root, "log", "--numstat", "--format=%s%%H%%n%%an%%n%%B" % sep],
    text=True, errors="replace")
authors, churn, commits = collections.Counter(), collections.Counter(), 0
for rec in log.split(sep):
    if not rec.strip():
        continue
    commits += 1
    lines = rec.splitlines()
    if len(lines) < 2:
        continue
    authors[lines[1].strip()] += 1
    for ln in lines[2:]:
        low = ln.lower()
        if low.startswith("co-authored-by:"):
            authors[ln.split(":", 1)[1].split("<")[0].strip()] += 1
        parts = ln.split("\t")
        if len(parts) == 3 and parts[0].isdigit():
            churn[parts[2]] += int(parts[0]) + int(parts[1] or 0)
total = sum(authors.values()) or 1
json.dump({"tool": "git-churn", "commits": commits,
           "contributors": len(authors),
           "ownership_pct": {a: round(100.0 * n / total, 1) for a, n in authors.items()},
           "top_churn": churn.most_common(10)},
          open(os.path.join(root, "reports", "git-churn.json"), "w"), indent=2)
PY
exit 0
