#!/usr/bin/env bash
# opentelemetry
set -uo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
. "$REPO_ROOT/tools/_skip.sh"

# --- why this tool has the status it has on this family -------------------
# STATUS CHANGED AT THIS FAMILY, for the same reason as Coverlet: netstandard2.0 clears at net461, so the target framework no longer excludes it and only NuGet does. Note separately that tracing is not path coverage. The TypeScript corpus shipped an OTel bootstrap that registered a no-op processor, exported nothing and exited 0 -- a structurally zero result.
missing "STATUS CHANGED AT THIS FAMILY, for the same reason as Coverlet: netstandard2.0 clears at net461, so the target framework no longer excludes it and only NuGet does"

exit 0
