#!/usr/bin/env bash
# TypeScript compiler (tsc) runner -- branch TS-019 (Node 12, yarn (Berry), Monolith).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
mkdir -p reports

echo "[tsc] version:"; node_modules/.bin/tsc --version
echo "[tsc] 1/2 type-check the whole project (expect zero diagnostics)"
node_modules/.bin/tsc -p tsconfig.json --noEmit
echo "[tsc] 2/2 emit CommonJS + declarations + source maps to dist/"
node_modules/.bin/tsc -p tsconfig.build.json
test -f dist/src/index.js || { echo "[tsc] FAIL: no emit"; exit 1; }
echo "[tsc] OK"
