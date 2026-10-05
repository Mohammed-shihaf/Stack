#!/usr/bin/env bash
# Rollup (tsc-backed) runner -- branch TS-023 (Node 12, bun, Monolith).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
mkdir -p reports

# Rollup 2.80.0 -- the newest release whose engines admit Node 12.
# Rollup 3.x requires >=14.18, Rollup 4.x requires >=18.
#
# Unlike the esbuild and Vite branches, the TypeScript transform here is
# **tsc 5.0.4** (via @rollup/plugin-typescript 8.5.0), not esbuild. Rollup only
# links. That makes this the one bundler in the corpus that type-checks while
# it builds.
echo "[rollup] version:"; node_modules/.bin/rollup --version
echo "[rollup] plugin-typescript: $(node -p "require('@rollup/plugin-typescript/package.json').version")"
echo "[rollup] transform performed by tsc: $(node -p "require('typescript/package.json').version")"
node_modules/.bin/rollup --config rollup.config.cjs
test -f build/bundle.cjs || { echo "[rollup] FAIL: no bundle emitted"; exit 1; }
echo "[rollup] bundle emitted -- now proving it RUNS (gate 11)"
node -e "
  const b = require('./build/bundle.cjs');
  const s = b.run();
  if (!s.priced || s.priced.length === 0) { console.error('[rollup] FAIL: bundle produced no output'); process.exit(1); }
  console.log('[rollup] bundle runs on', s.runtime, '-- priced', s.priced.length, 'orders');
"
