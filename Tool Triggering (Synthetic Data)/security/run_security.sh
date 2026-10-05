#!/usr/bin/env bash
# eslint-plugin-security runner -- branch TS-060 (Node 16, yarn (Berry), Microservices).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
mkdir -p reports

# Read a dependency's version WITHOUT require()-ing its package.json.
# Modern packages declare an "exports" map that omits "./package.json", so
# require('<pkg>/package.json') throws ERR_PACKAGE_PATH_NOT_EXPORTED --
# @rollup/plugin-typescript 12.x is one. Reading the file directly works under
# every package manager, because these are all DIRECT dependencies.
pkgver() {
  node -e "try{console.log(JSON.parse(require('fs').readFileSync('node_modules/'+process.argv[1]+'/package.json','utf8')).version)}catch(e){console.log('unresolved')}" "$1"
}

echo "[security] eslint-plugin-security $(pkgver eslint-plugin-security)"
# The plugin exports BOTH `recommended` (flat-config shape) and
# `recommended-legacy` (eslintrc shape). Extending the flat one under eslint 8
# fails schema validation, and eslint then throws
# "Converting circular structure to JSON" while FORMATTING that error -- so the
# output is a stack trace that never names the cause. .eslintrc.cjs extends
# `plugin:security/recommended-legacy`. See TOOL-ROSTER.md.
node_modules/.bin/eslint packages/domain/src/analysis/sast-fixture.ts packages/domain/src/analysis/taint-fixture.ts \
  --no-inline-config --format json > reports/security.json || true
node -e "
  const files = require('./reports/security.json');
  const sec = files.flatMap(f=>f.messages.filter(m=>m.ruleId&&m.ruleId.startsWith('security/')));
  const byRule = {};
  sec.forEach(m=>{byRule[m.ruleId]=(byRule[m.ruleId]||0)+1});
  Object.entries(byRule).forEach(([r,n])=>console.log('[security]', r, '->', n));
  console.log('[security] total', sec.length, 'findings');
  if (sec.length < 4) { console.error('[security] FAIL: expected the planted flows to fire'); process.exit(1); }
"
