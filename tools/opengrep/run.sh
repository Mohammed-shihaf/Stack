#!/usr/bin/env bash
# opengrep
set -uo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
. "$REPO_ROOT/tools/_skip.sh"

# --- why this tool has the status it has on this family -------------------
# Standalone binary, absent from this host. Class B when present. NOTE: the sheet declares 'C# 12+', which inverts the hazard -- a tree-sitter grammar has no language floor, only a construct set, so the risk runs toward NEWER syntax.
missing "Standalone binary, absent from this host"

exit 0
