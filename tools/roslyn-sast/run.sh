#!/usr/bin/env bash
# roslyn-sast
set -uo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
. "$REPO_ROOT/tools/_skip.sh"

# --- why this tool has the status it has on this family -------------------
# The sheet says 'roslyn sast', also not a package. Resolved here to SecurityCodeScan + Microsoft.CodeAnalysis.NetAnalyzers. NuGet unreachable.
missing "The sheet says 'roslyn sast', also not a package"

exit 0
