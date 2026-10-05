#!/usr/bin/env bash
# Vite (esbuild-backed) runner -- branch TS-010 (Node 12, npm, Microservices).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
mkdir -p reports

# Vite 2.9.18 -- the newest release whose engines admit Node 12 (>=12.2.0).
# Vite 3+ requires ^14.18 || >=16, Vite 5+ requires ^18 || >=20.
#
# "built as esbuild": Vite transforms TypeScript with esbuild (its own
# ^0.14.27, NOT the 0.21.5 the esbuild-bundler branches pin) and links the
# bundle with Rollup. Both facts are recorded in dataset.json.
echo "[vite] version: $(node -p "require('vite/package.json').version")"
echo "[vite] internal esbuild: $(node -p "require('esbuild/package.json').version")"
node_modules/.bin/vite build --config vite.config.ts
test -f build/bundle.cjs || { echo "[vite] FAIL: no bundle emitted"; exit 1; }
echo "[vite] bundle emitted -- now proving it RUNS (gate 11)"
node -e "
  const b = require('./build/bundle.cjs');
  const s = b.run();
  if (!s.priced || s.priced.length === 0) { console.error('[vite] FAIL: bundle produced no output'); process.exit(1); }
  console.log('[vite] bundle runs on', s.runtime, '-- priced', s.priced.length, 'orders');
"
