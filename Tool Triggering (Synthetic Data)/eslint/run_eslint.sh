#!/usr/bin/env bash
# eslint runner -- branch TS-050 (Node 16, npm, Microservices).
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

echo "[eslint] version:"; node_modules/.bin/eslint --version
echo
echo "[eslint] 0/3 the config must LOAD (gate G3)"
node_modules/.bin/eslint --print-config packages/domain/src/services/order-service.ts > /dev/null
echo "[eslint] config loads OK"
echo
echo "[eslint] 1/3 real source, fixtures excluded -- expect clean"
node_modules/.bin/eslint 'packages/domain/src/models/**/*.ts' 'packages/domain/src/services/**/*.ts' packages/domain/src/index.ts --format unix
echo "[eslint] real source clean"
echo
echo "[eslint] 2/3 planted lint fixture -- expect findings"
# --no-inline-config defeats the file-level /* eslint-disable */ the fixture carries.
node_modules/.bin/eslint packages/domain/src/analysis/lint-violations.ts --no-inline-config --format unix || true
echo
echo "[eslint] 3/3 full tree summary"
node_modules/.bin/eslint 'packages/domain/src/**/*.ts' --no-inline-config --format json > reports/eslint.json || true
node -e "
  const r = require('./reports/eslint.json');
  const n = r.reduce((a,f)=>a+f.messages.length,0);
  console.log('[eslint]', n, 'findings across', r.length, 'files');
  if (n === 0) { console.error('[eslint] FAIL: fixtures produced no findings'); process.exit(1); }
"
