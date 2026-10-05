#!/usr/bin/env bash
# jscpd runner -- branch TS-004 (Node 12, yarn (Berry), Microservices).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
mkdir -p reports

echo "[jscpd] version:"; node_modules/.bin/jscpd --version
# Gate G8: the planted duplicate pair must be found with the COMMITTED config,
# no --min-tokens override. WillowBrook found 0 clones as shipped and only 1
# at --min-tokens 20.
#
# TRAP: jscpd 3.2.1 resolves scan paths relative to the CONFIG FILE'S DIRECTORY,
# not the working directory. With the config under tools/jscpd/, a path of
# "src" is looked up as tools/jscpd/src, which does not exist -- so jscpd
# scans nothing, reports nothing, and STILL EXITS 0. The `path` key inside the
# config file is ignored entirely; only the CLI argument is honoured.
# Hence: config at the repo root, path passed explicitly.
node_modules/.bin/jscpd --config .jscpd.json packages/domain/src
node -e "
  const r = require('./reports/jscpd/jscpd-report.json');
  const n = (r.statistics && r.statistics.total && r.statistics.total.clones) || 0;
  console.log('[jscpd] clones at default thresholds:', n);
  if (n < 1) { console.error('[jscpd] FAIL: planted duplicate not detected as shipped'); process.exit(1); }
  console.log('[jscpd] OK');
"
