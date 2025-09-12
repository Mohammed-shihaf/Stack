#!/usr/bin/env bash
# coverlet
set -uo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
. "$REPO_ROOT/tools/_skip.sh"

# --- why this tool has the status it has on this family -------------------
# STATUS CHANGED AT THIS FAMILY. net45 and net46 sat below netstandard2.0, whose .NET Framework floor is net461, so Coverlet was excluded by the TARGET FRAMEWORK and exited 3. This family is above that floor: nothing about net462 excludes Coverlet. It is now held out only by NuGet being refused at this host's egress proxy, which is a setup gap -- exit 4. The 18 metrics it is primary for (statement 5, branch 7, delta 6) are dark for a completely different reason than they were one family ago, and collapsing 3 and 4 would hide that.
missing "STATUS CHANGED AT THIS FAMILY"

exit 0
