#!/usr/bin/env bash
# minicover
set -uo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
. "$REPO_ROOT/tools/_skip.sh"

# --- why this tool has the status it has on this family -------------------
# MiniCover 3.10.0 declares .NET SDK 8.0/9.0/10.0 only -- verified against its own MiniCover.csproj (<TargetFrameworks>net10.0;net9.0;net8.0</TargetFrameworks>). It is the alternative for 22 metrics and cannot reach any .NET Framework target.
skip "MiniCover 3.10.0 declares .NET SDK 8.0/9.0/10.0 only -- verified against its own MiniCover.csproj (<TargetFrameworks>net10.0;net9.0;net8.0</TargetFrameworks>)"

exit 0
