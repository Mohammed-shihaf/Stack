#!/usr/bin/env bash
# Vite (esbuild-backed) runner -- branch TS-013 (Node 12, pnpm, Monolith).
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
# Resolve esbuild THROUGH vite. Under pnpm's strict (isolated) node_modules,
# esbuild is vite's transitive dependency and is not hoisted to the top level,
# so a bare require('esbuild/package.json') throws MODULE_NOT_FOUND. It happens
# to work under npm's flat layout -- which is exactly the kind of
# package-manager-dependent behaviour this corpus exists to surface.
echo "[vite] internal esbuild: $(node -p "require(require.resolve('esbuild/package.json',{paths:[require.resolve('vite')]})).version" 2>/dev/null || echo 'unresolved')"
node_modules/.bin/vite build --config vite.config.ts
test -f build/bundle.cjs || { echo "[vite] FAIL: no bundle emitted"; exit 1; }
echo "[vite] bundle emitted -- now proving it RUNS (gate 11)"
node -e "
  const b = require('./build/bundle.cjs');
  const s = b.run();
  if (!s.priced || s.priced.length === 0) { console.error('[vite] FAIL: bundle produced no output'); process.exit(1); }
  console.log('[vite] bundle runs on', s.runtime, '-- priced', s.priced.length, 'orders');
"
