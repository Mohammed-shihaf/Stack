#!/usr/bin/env bash
# ts-prune runner -- branch TS-003 (Node 12, yarn (Berry), Monolith).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
mkdir -p reports

echo "[ts-prune] version: $(node -p "require('ts-prune/package.json').version")"
node_modules/.bin/ts-prune -p tsconfig.json | tee reports/ts-prune.txt || true
grep -q "settleLegacyInvoice" reports/ts-prune.txt || {
  echo "[ts-prune] FAIL: planted unused export not reported"; exit 1; }
echo "[ts-prune] OK -- planted unused export detected"
