#!/usr/bin/env bash
# OSS Review Toolkit (cdxgen license proxy) runner -- branch TS-012 (Node 12, yarn (Berry), Microservices).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
mkdir -p reports

# OSS Review Toolkit is a JVM application and is NOT installed here. The
# license inventory is derived from the CycloneDX SBOM that cdxgen produces --
# the same input ORT's analyzer would consume. Declared honestly as a proxy.
test -f reports/sbom.json || bash tools/cdxgen/run_cdxgen.sh
node -e "
  const s = require('./reports/sbom.json');
  const tally = {};
  (s.components||[]).forEach(c=>{
    const ls = (c.licenses||[]).map(l=>(l.license&&(l.license.id||l.license.name))||l.expression||'UNKNOWN');
    (ls.length?ls:['UNDECLARED']).forEach(l=>{tally[l]=(tally[l]||0)+1});
  });
  require('fs').writeFileSync('reports/licenses.json', JSON.stringify(tally,null,2));
  const rows = Object.entries(tally).sort((a,b)=>b[1]-a[1]);
  console.log('[ort] distinct licenses:', rows.length);
  rows.slice(0,10).forEach(([l,n])=>console.log('   ', String(n).padStart(4), l));
"
