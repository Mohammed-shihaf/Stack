#!/usr/bin/env bash
# @opentelemetry/sdk-node runner -- branch TS-003 (Node 12, yarn (Berry), Monolith).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
mkdir -p reports

echo "[otel] sdk-node: $(node -p "require('@opentelemetry/sdk-node/package.json').version")"
test -f dist/src/index.js || bash tools/typescript/run_tsc.sh
node -r ./tools/opentelemetry/otel-bootstrap.js -e "require('./dist/src/index.js').run()"
node -e "
  const s = require('./reports/otel-spans.json');
  console.log('[otel] spans captured:', s.length);
  s.slice(0,8).forEach(x=>console.log('   ', x.name, x.durationMs.toFixed(3)+'ms'));
  if (!s.length) { console.error('[otel] FAIL: no spans emitted'); process.exit(1); }
"
