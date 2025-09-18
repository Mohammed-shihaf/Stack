#!/usr/bin/env bash
# stryker
set -uo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
. "$REPO_ROOT/tools/_skip.sh"

# --- why this tool has the status it has on this family -------------------
# Requires an SDK-style project and a modern SDK to run. Also: the sheet makes it primary for 16 Data Flow metrics, which it cannot compute -- see roslyn-dataflow.
skip "Requires an SDK-style project and a modern SDK to run"

exit 0
