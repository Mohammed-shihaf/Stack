#!/usr/bin/env bash
# mocha runner -- branch TS-009 (Node 12, npm, Monolith).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
mkdir -p reports

echo "[mocha] version:"; node_modules/.bin/mocha --version
node_modules/.bin/mocha --config tools/mocha/.mocharc.cjs --reporter spec
