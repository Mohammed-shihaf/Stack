#!/usr/bin/env bash
# diff-cover
set -uo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
. "$REPO_ROOT/tools/_skip.sh"

# --- why this tool has the status it has on this family -------------------
# Class C: reads Cobertura/OpenCover XML. No coverage report can be produced on this family, so it has nothing to read.
skip "Class C: reads Cobertura/OpenCover XML"

exit 0
