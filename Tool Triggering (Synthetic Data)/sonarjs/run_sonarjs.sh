#!/usr/bin/env bash
# eslint-plugin-sonarjs runner -- branch TS-017 (Node 12, npm, Monolith).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
mkdir -p reports

echo "[sonarjs] eslint-plugin-sonarjs $(node -p "require('eslint-plugin-sonarjs/package.json').version")"
echo "[sonarjs] cognitive complexity limit is 15 (.eslintrc.cjs)"
node_modules/.bin/eslint src/analysis/complexity-sample.ts --no-inline-config --format json > reports/sonarjs.json || true
node -e "
  const m = (require('./reports/sonarjs.json')[0]||{}).messages||[];
  const cc = m.filter(x=>x.ruleId==='sonarjs/cognitive-complexity');
  const cx = m.filter(x=>x.ruleId==='complexity');
  cc.forEach(x=>console.log('[sonarjs] cognitive:', x.message));
  cx.forEach(x=>console.log('[sonarjs] cyclomatic:', x.message));
  if (cc.length === 0) { console.error('[sonarjs] FAIL: planted complexity fixture did not fire'); process.exit(1); }
  console.log('[sonarjs] OK -- fixture fires at shipped settings');
"
