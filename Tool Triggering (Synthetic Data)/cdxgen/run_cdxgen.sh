#!/usr/bin/env bash
# @cyclonedx/cdxgen runner -- branch TS-002 (Node 12, npm, Microservices).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
mkdir -p reports

echo "[cdxgen] version: $(node -p "require('@cyclonedx/cdxgen/package.json').version")"
FETCH_LICENSE=false node_modules/.bin/cdxgen -t nodejs -o reports/sbom.json . || true
node -e "
  const s = require('./reports/sbom.json');
  console.log('[cdxgen] format:', s.bomFormat, s.specVersion, '| components:', (s.components||[]).length);
  if (!(s.components||[]).length) { console.error('[cdxgen] FAIL: empty SBOM'); process.exit(1); }
"
