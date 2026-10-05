#!/usr/bin/env bash
# npm-check-updates runner -- branch TS-022 (Node 12, pnpm, Microservices).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
mkdir -p reports

# The requested ncu 19.6.6 requires Node >= 18 and cannot run here.
# 12.5.12 is the newest release whose engines admit Node 12.
echo "[ncu] version: $(node -p "require('npm-check-updates/package.json').version")"
node_modules/.bin/ncu --jsonUpgraded > reports/outdated.json || true
node -e "
  const u = require('./reports/outdated.json');
  const n = Object.keys(u||{}).length;
  console.log('[ncu]', n, 'dependencies have newer releases than the pinned set');
  Object.entries(u||{}).slice(0,8).forEach(([k,v])=>console.log('   ', k, '->', v));
"
