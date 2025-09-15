#!/usr/bin/env bash
# lizard
set -uo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
. "$REPO_ROOT/tools/_skip.sh"

# --- why this tool has the status it has on this family -------------------
# Python tokeniser. Class B: own parser, never loads a compiler, so the TFM is irrelevant to it.

require_cmd lizard
OUT="$(report_dir)/lizard.json"
FINDINGS_RC="1"
lizard -l csharp --xml "$REPO_ROOT/src" > "$(report_dir)/lizard.xml" 2>/dev/null
rc=$?
lizard -l csharp "$REPO_ROOT/src" > "$(report_dir)/lizard.txt" 2>/dev/null
accept_findings $rc || exit 1
python3 - "$OUT" <<'PY'
import json, re, sys, os
txt = open(os.path.join(os.environ.get("REPO_ROOT","."), "reports", "lizard.txt")).read()
m = re.findall(r'^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\S+)@', txt, re.M)
peak = max(((int(c), f) for _, c, _, _, _, f in m), default=(0, None))
if not m:
    sys.exit("STRUCTURALLY ZERO: lizard counted no functions. '-l csharp' is required; "
             "without it lizard guesses by extension and reports an empty analysis "
             "at exit 0.")
json.dump({"tool": "lizard", "functions": len(m), "max_ccn": peak[0]},
          open(sys.argv[1], "w"), indent=2)
print("lizard: %d functions, peak CCN %d" % (len(m), peak[0]))
PY
exit $?
