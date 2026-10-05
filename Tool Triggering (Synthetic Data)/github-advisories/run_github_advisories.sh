#!/usr/bin/env bash
# Dependabot / GitHub Security Advisories API runner -- branch TS-001 (Node 12, npm, Monolith).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
mkdir -p reports

# Dependabot data via the GitHub Security Advisories API.
# api.github.com is reachable from this environment (verified). Unauthenticated
# requests are rate limited to 60/hour; set GITHUB_TOKEN to raise that.
AUTH=()
if [ -n "${GITHUB_TOKEN:-}" ]; then AUTH=(-H "authorization: Bearer $GITHUB_TOKEN"); fi
echo "[advisories] querying GitHub global advisories for the planted pins"
: > reports/advisories.json
echo "[" >> reports/advisories.json
first=1
while read -r pkg ver; do
  [ -z "$pkg" ] && continue
  resp=$(curl -sS -m 20 "${AUTH[@]}" \
    "https://api.github.com/advisories?ecosystem=npm&affects=$pkg@$ver&per_page=5" 2>/dev/null || echo "[]")
  count=$(node -e "try{const a=JSON.parse(process.argv[1]);console.log(Array.isArray(a)?a.length:0)}catch(e){console.log(0)}" "$resp")
  echo "[advisories] $pkg@$ver -> $count advisory/advisories"
  [ $first -eq 0 ] && echo "," >> reports/advisories.json
  first=0
  printf '{"package":"%s","version":"%s","advisories":%s}' "$pkg" "$ver" "$resp" >> reports/advisories.json
done < tools/grype/planted-pins.txt
echo "]" >> reports/advisories.json
echo "[advisories] written to reports/advisories.json"
