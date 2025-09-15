#!/usr/bin/env bash
# jscpd
set -uo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
. "$REPO_ROOT/tools/_skip.sh"

# --- why this tool has the status it has on this family -------------------
# Node, own tokeniser. Class B.

require_cmd jscpd
FINDINGS_RC="1"   # jscpd's threshold is a FAILURE BUDGET, not a detection floor:
                  # at 0 it exits 1 the moment it finds anything, and this corpus
                  # plants a duplicate pair on purpose. A correct run is not a failure.
#
# The format token is "csharp", NOT "c#". Given "c#" jscpd prints a warning to
# stderr, matches ZERO files, writes a valid-looking report saying clones: 0, and
# EXITS 0 -- a platform grading by exit code grades that green. This runner
# therefore asserts it scanned something: an unexplained zero is worse than a
# failure, because nothing in the exit-code contract can see it.
jscpd "$REPO_ROOT/src" --format "csharp" --min-tokens 50 --reporters json,console \
      --output "$(report_dir)/jscpd" --threshold 100
accept_findings $? || exit 1
python3 "$REPO_ROOT/tools/jscpd/assert_nonzero.py" \
        "$(report_dir)/jscpd/jscpd-report.json"
exit $?
