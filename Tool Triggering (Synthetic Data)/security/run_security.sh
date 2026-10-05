#!/usr/bin/env bash
# eslint-plugin-security runner -- branch TS-011 (Node 12, yarn (Berry), Monolith).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
mkdir -p reports

echo "[security] eslint-plugin-security $(node -p "require('eslint-plugin-security/package.json').version")"
# The plugin exports BOTH `recommended` (flat-config shape) and
# `recommended-legacy` (eslintrc shape). Extending the flat one under eslint 8
# fails schema validation, and eslint then throws
# "Converting circular structure to JSON" while FORMATTING that error -- so the
# output is a stack trace that never names the cause. .eslintrc.cjs extends
# `plugin:security/recommended-legacy`. See TOOL-ROSTER.md.
node_modules/.bin/eslint src/analysis/sast-fixture.ts src/analysis/taint-fixture.ts \
  --no-inline-config --format json > reports/security.json || true
node -e "
  const files = require('./reports/security.json');
  const sec = files.flatMap(f=>f.messages.filter(m=>m.ruleId&&m.ruleId.startsWith('security/')));
  const byRule = {};
  sec.forEach(m=>{byRule[m.ruleId]=(byRule[m.ruleId]||0)+1});
  Object.entries(byRule).forEach(([r,n])=>console.log('[security]', r, '->', n));
  console.log('[security] total', sec.length, 'findings');
  if (sec.length < 4) { console.error('[security] FAIL: expected the planted flows to fire'); process.exit(1); }
"
