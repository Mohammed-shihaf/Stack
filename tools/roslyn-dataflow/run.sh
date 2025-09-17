#!/usr/bin/env bash
# roslyn-dataflow
set -uo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
. "$REPO_ROOT/tools/_skip.sh"

# --- why this tool has the status it has on this family -------------------
# PROPOSED REPAIR, not in the source sheet. The sheet assigns Data Flow to Stryker.NET, a mutation tester that computes no def-use chains. AnalyzeDataFlow is a real Roslyn API that ships in the SDK and yields genuine def/use sets.
missing "PROPOSED REPAIR, not in the source sheet"

exit 0
