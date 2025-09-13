#!/usr/bin/env bash
# altcover
set -uo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
. "$REPO_ROOT/tools/_skip.sh"

# --- why this tool has the status it has on this family -------------------
# Declares .NET Framework 2.0+ via a net20 recorder, so it is the one coverage tool in the roster that could reach this family. Blocked only by NuGet.
missing "Declares .NET Framework 2.0+ via a net20 recorder, so it is the one coverage tool in the roster that could reach this family"

exit 0
