#!/usr/bin/env bash
# fast-check runner -- branch TS-004 (Node 12, yarn (Berry), Microservices).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
mkdir -p reports

echo "[fast-check] version: $(node -p "require('fast-check/package.json').version")"
node_modules/.bin/mocha --config tools/mocha/.mocharc.cjs --grep "properties" --reporter spec
