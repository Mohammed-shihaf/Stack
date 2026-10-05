#!/usr/bin/env bash
# knip runner -- branch TS-050 (Node 16, npm, Microservices).
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

# knip 2.43.0 -- engines ">=16.17.0 <17 || >=18.6.0".
#
# Node 16 is the FIRST version in this corpus where knip runs at all. It was on
# the skip list for Node 12 and Node 14 because no published version supports
# either runtime. Its distinct contribution over ts-prune is unused *files* and
# unused *dependencies*, not just unused exports.
echo "[knip] version: $(pkgver knip)"
node_modules/.bin/knip --config knip.json --reporter json > reports/knip.json 2>/dev/null || true
node -e "
  let rows; try { rows = require('./reports/knip.json'); } catch (e) { console.log('[knip] no JSON report'); process.exit(1); }
  // knip's JSON reporter emits a FLAT ARRAY of per-file rows, each with a
  // boolean 'files' flag plus arrays for the other issue kinds.
  const KINDS = ['dependencies','devDependencies','unlisted','exports','types','duplicates','binaries','unresolved'];
  let unusedFiles = 0; const tally = {};
  for (const row of rows) {
    if (row.files) unusedFiles += 1;
    for (const k of KINDS) { const n = (row[k] || []).length; if (n) tally[k] = (tally[k] || 0) + n; }
  }
  console.log('[knip] unused files:', unusedFiles);
  Object.entries(tally).forEach(([k, v]) => console.log('[knip] unused ' + k + ':', v));
  const total = unusedFiles + Object.values(tally).reduce((a, b) => a + b, 0);
  console.log('[knip] total findings:', total);
  if (total === 0) { console.error('[knip] FAIL: planted dead code produced no findings'); process.exit(1); }
"
