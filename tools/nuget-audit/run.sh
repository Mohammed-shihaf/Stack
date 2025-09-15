#!/usr/bin/env bash
# nuget-audit
set -uo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
. "$REPO_ROOT/tools/_skip.sh"

# --- why this tool has the status it has on this family -------------------
# Requires PackageReference and an SDK-style project. Structurally impossible on the packages.config cells, and requires a restore this host cannot perform.
skip "Requires PackageReference and an SDK-style project"

exit 0
