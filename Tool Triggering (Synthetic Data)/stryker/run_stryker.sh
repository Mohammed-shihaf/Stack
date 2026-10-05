#!/usr/bin/env bash
# @stryker-mutator/core runner -- branch TS-013 (Node 12, pnpm, Monolith).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
mkdir -p reports

echo "[stryker] version: $(node -p "require('@stryker-mutator/core/package.json').version")"
node_modules/.bin/stryker run tools/stryker/stryker.conf.json || true
if [ -f reports/mutation/mutation.json ]; then
  node -e "
    const r = require('./reports/mutation/mutation.json');
    let killed=0,total=0;
    Object.values(r.files||{}).forEach(f=>f.mutants.forEach(m=>{total++;if(m.status==='Killed')killed++;}));
    console.log('[stryker] mutants:', total, '| killed:', killed, '| score:', total? (100*killed/total).toFixed(2)+'%':'n/a');
  "
else
  echo "[stryker] no mutation report produced"
fi
