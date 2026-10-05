#!/usr/bin/env bash
# esbuild runner -- branch TS-006 (Node 12, pnpm, Microservices).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
mkdir -p reports

echo "[esbuild] version:"; node_modules/.bin/esbuild --version
node tools/esbuild/esbuild.config.cjs
test -f build/bundle.cjs || { echo "[esbuild] FAIL: no bundle emitted"; exit 1; }
echo "[esbuild] bundle emitted -- now proving it RUNS (gate 11)"
node -e "
  const b = require('./build/bundle.cjs');
  const s = b.run();
  if (!s.priced || s.priced.length === 0) { console.error('[esbuild] FAIL: bundle produced no output'); process.exit(1); }
  console.log('[esbuild] bundle runs on', s.runtime, '-- priced', s.priced.length, 'orders');
"
