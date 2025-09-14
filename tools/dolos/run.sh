#!/usr/bin/env bash
# dolos
set -uo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
. "$REPO_ROOT/tools/_skip.sh"

# --- why this tool has the status it has on this family -------------------
# Node, tree-sitter C# grammar. Class B, and the sheet's declaration ('C# language-version independent - source similarity, not tied to compiler') is correct. MEASURED, not assumed: @dodona/dolos 2.9.3 fails to install on this host because @dodona/dolos-parsers 1.4.1 needs node-gyp native compilation, which fails under node 22.22.2. That is exit 4 (absent from this host), not exit 3 (cannot run on this family) -- collapsing the two would let a missing binary masquerade as a .NET Framework result.
missing "Node, tree-sitter C# grammar"

require_cmd dolos
dolos run -f csv -o "$(report_dir)/dolos" -l c-sharp "$REPO_ROOT"/src/**/*.cs
accept_findings $? || exit 1
exit 0
