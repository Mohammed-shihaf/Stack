#!/usr/bin/env bash
# nyc + ts-node (coverage cross-check) runner -- branch TS-016 (Node 12, bun, Microservices).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
mkdir -p reports

echo "[nyc] version:"; node_modules/.bin/nyc --version
# NOTE: nyc instruments the TypeScript DIRECTLY via ts-node/register.
# Reporting compiled output through a source-map remap silently yields 0%:
# the file is remapped to .ts, an --include written against dist/** stops
# matching, and the report empties while the process still exits 0.
# See TOOLCHAIN-VERIFICATION.md, Finding 1.
TS_NODE_PROJECT=tsconfig.json node_modules/.bin/nyc --nycrc-path tools/nyc/.nycrc.json \
  node_modules/.bin/mocha --config tools/mocha/.mocharc.cjs
echo
node -e "
  const s = require('./coverage-nyc/coverage-summary.json').total;
  console.log('[nyc] stmts', s.statements.pct + '%', '| branch', s.branches.pct + '%', '| funcs', s.functions.pct + '%');
  if (!(s.statements.pct > 0)) { console.error('[nyc] FAIL: zero coverage'); process.exit(1); }
  console.log('[nyc] OK -- non-zero, and independent of c8');
"
