#!/usr/bin/env bash
# trivy
set -uo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
. "$REPO_ROOT/tools/_skip.sh"

# --- why this tool has the status it has on this family -------------------
# Standalone Go binary, absent from this host. Class C: reads manifests/lockfiles.
missing "Standalone Go binary, absent from this host"

exit 0
