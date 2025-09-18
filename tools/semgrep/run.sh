#!/usr/bin/env bash
# semgrep
set -uo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
. "$REPO_ROOT/tools/_skip.sh"

# --- why this tool has the status it has on this family -------------------
# Python, tree-sitter C# grammar. Class B.

require_cmd semgrep
FINDINGS_RC="1"   # semgrep exits 1 when rules match; that is a successful run
semgrep --config "$REPO_ROOT/tools/semgrep/rules.yml" \
        --json --output "$(report_dir)/semgrep.json" "$REPO_ROOT/src"
accept_findings $? || exit 1
exit 0
