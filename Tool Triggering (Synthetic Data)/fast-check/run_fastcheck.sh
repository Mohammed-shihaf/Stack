#!/usr/bin/env bash
# fast-check runner -- branch TS-033 (Node 14, npm, Monolith).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
mkdir -p reports

# Read a dependency's version WITHOUT require()-ing its package.json.
# Modern packages declare an "exports" map that does not list "./package.json",
# so require('<pkg>/package.json') throws ERR_PACKAGE_PATH_NOT_EXPORTED --
# @rollup/plugin-typescript 12.x is one. Reading the file directly works under
# every package manager, because these are all DIRECT dependencies and npm,
# yarn, pnpm and bun each place (or symlink) those at node_modules/<pkg>.
pkgver() {
  node -e "try{console.log(JSON.parse(require('fs').readFileSync('node_modules/'+process.argv[1]+'/package.json','utf8')).version)}catch(e){console.log('unresolved')}" "$1"
}

echo "[fast-check] version: $(pkgver fast-check)"
node_modules/.bin/mocha --config tools/mocha/.mocharc.cjs --grep "properties" --reporter spec
