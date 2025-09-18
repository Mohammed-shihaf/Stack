#!/usr/bin/env bash
# unilyze
set -uo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
. "$REPO_ROOT/tools/_skip.sh"

# --- why this tool has the status it has on this family -------------------
# NOT A TOOL. The only package of this name anywhere is PyPI `unilyze` 0.2.1, 'Get detailed unicode information about characters and text', last released 2020-07-23. Not on npm. It has no .NET surface of any kind. The source sheet assigns it as the alternative for 34 of the 103 metrics and declares '.NET 8-10, C# 8-14' for it, which is a fabricated capability claim. This runner exits 3 and says so, so the hole is visible rather than invisible.
skip "NOT A TOOL"

exit 0
