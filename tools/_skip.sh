#!/usr/bin/env bash
# Sourced by every runner. Do not invoke directly.
#
# Exit-code contract:
#   0 ran | 1 failed | 3 SKIPPED (cannot run here) | 4 NOT INSTALLED (absent from host)
#
# The status namespace is OURS. A tool's own exit codes are translated at this
# boundary and are never allowed to escape as 3 or 4.

RC_OK=0; RC_FAIL=1; RC_SKIP=3; RC_MISSING=4

_reason() { printf '%s\n' "$*" >&2; }

skip() {            # cannot run on this family -- this is the measurement
  _reason "SKIPPED: $*"
  exit $RC_SKIP
}

missing() {         # absent from this host -- a setup gap, not a finding
  _reason "NOT INSTALLED: $*"
  exit $RC_MISSING
}

require_cmd() {     # probe an executable
  command -v "$1" >/dev/null 2>&1 || missing "$1 is not on PATH"
}

require_artifact() { # probe the tool's OWN artefact, not its interpreter.
  [ -e "$1" ] || missing "${2:-$1} not present"
}

require_python_module() {
  python3 -c "import $1" >/dev/null 2>&1 || missing "python module '$1' not importable"
}

require_restore() { # every NuGet-backed tool needs this and none of them have it
  [ -d "$REPO_ROOT/packages" ] || [ -d "$HOME/.nuget/packages" ] \
    || skip "no restored package graph; NuGet is refused at this host's egress proxy"
}

# Translate a tool's own exit code without letting it collide with our namespace.
# FINDINGS_RC lets a runner declare the codes its tool uses for "found something",
# which is a successful run, not a failure.
accept_findings() {
  local rc="$1"; shift
  local ok
  for ok in 0 ${FINDINGS_RC:-}; do
    if [ "$rc" = "$ok" ]; then return 0; fi
  done
  # never return 3 or 4 from a tool's own status
  return 1
}

report_dir() {
  mkdir -p "$REPO_ROOT/reports"
  printf '%s' "$REPO_ROOT/reports"
}
