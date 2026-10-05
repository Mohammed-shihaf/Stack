#!/usr/bin/env bash
# c8 (V8 coverage, primary) runner -- branch TS-002 (Node 12, npm, Microservices).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
mkdir -p reports

echo "[c8] version:"; node_modules/.bin/c8 --version
node_modules/.bin/c8 --config tools/c8/.c8rc.json \
  node_modules/.bin/mocha --config tools/mocha/.mocharc.cjs
echo
echo "[c8] gate G2 -- coverage must be non-zero"
node -e "
  const s = require('./coverage/coverage-summary.json').total;
  console.log('[c8] stmts', s.statements.pct + '%', '| branch', s.branches.pct + '%', '| funcs', s.functions.pct + '%');
  if (!(s.statements.pct > 0)) { console.error('[c8] FAIL: zero coverage -- the FlintAtlas/WillowBrook defect'); process.exit(1); }
  console.log('[c8] OK -- non-zero');
"
