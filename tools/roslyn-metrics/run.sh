#!/usr/bin/env bash
# roslyn-metrics
set -uo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
. "$REPO_ROOT/tools/_skip.sh"

# --- why this tool has the status it has on this family -------------------
# The sheet says 'Roslyn', which is a compiler platform, not a package. Resolved here to SonarAnalyzer.CSharp (rule S3776 is cognitive complexity). Analyzer packages come from NuGet, which is refused at this host's egress proxy.
missing "The sheet says 'Roslyn', which is a compiler platform, not a package"

exit 0
