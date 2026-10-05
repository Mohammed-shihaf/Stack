#!/usr/bin/env bash
# dependency-cruiser runner -- branch TS-018 (Node 12, npm, Microservices).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
mkdir -p reports

echo "[depcruise] version:"; node_modules/.bin/depcruise --version
# TRAP: dependency-cruiser 11.18.0 given a bare DIRECTORY resolves only its
# default (JavaScript) extensions, finds no .ts, and reports
# "no dependency violations found (0 modules, 0 dependencies cruised)" -- with
# exit code 0. A glob is required. `options.extensions` is not a valid v11
# option and makes the whole config fail schema validation.
node_modules/.bin/depcruise --config tools/dependency-cruiser/.dependency-cruiser.cjs \
  --output-type json 'packages/domain/src/**/*.ts' > reports/depcruise.json || true
node_modules/.bin/depcruise --config tools/dependency-cruiser/.dependency-cruiser.cjs \
  --output-type err 'packages/domain/src/**/*.ts' || true
node -e "
  const r = require('./reports/depcruise.json');
  const s = r.summary || {};
  if ((r.modules||[]).length === 0) { console.error('[depcruise] FAIL: 0 modules cruised'); process.exit(1); }
  console.log('[depcruise] modules:', (r.modules||[]).length, '| violations:', (s.violations||[]).length);
  console.log('[depcruise] error:', s.error||0, 'warn:', s.warn||0, 'info:', s.info||0);
"
