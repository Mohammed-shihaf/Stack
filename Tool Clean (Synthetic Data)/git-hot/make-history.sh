#!/usr/bin/env bash
# Builds a small, fully deterministic git history for git-hot in ./history-repo (fixed author and dates, so the commit
# ids are the same on every run). Usage: bash make-history.sh [clean|hot]
#   clean : every line is written once and only ever appended to -- no line is rewritten, so line churn is 0.
#   hot   : lampLog.ts is rewritten on every commit -- the same line changes 17 times after it was added, a hot spot.
set -euo pipefail
MODE="${1:-clean}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$HERE/history-repo"
rm -rf "$OUT" && mkdir -p "$OUT/src" && cd "$OUT"
export GIT_AUTHOR_NAME="Ada Renwick" GIT_AUTHOR_EMAIL="ada@example.invalid" GIT_COMMITTER_NAME="Ada Renwick" GIT_COMMITTER_EMAIL="ada@example.invalid"
git init -q -b main .
n=0
commit() {  # commit <message>
  n=$((n + 1))
  local when; when="$(printf '2026-01-%02dT09:00:00+00:00' "$n")"
  git add -A
  GIT_AUTHOR_DATE="$when" GIT_COMMITTER_DATE="$when" git commit -q -m "$1"
}
cp "$HERE/src/lampLog.ts" src/lampLog.ts
cp "$HERE/src/lampSchedule.ts" src/lampSchedule.ts
if [ "$MODE" = "hot" ]; then
  sed -i -E "s/^export const SERVICE_INTERVAL_DAYS = [0-9]+;/export const SERVICE_INTERVAL_DAYS = 1;/" src/lampLog.ts
fi
commit "add lamp log and schedule"
if [ "$MODE" = "hot" ]; then
  for i in $(seq 2 18); do
    sed -i -E "s/^export const SERVICE_INTERVAL_DAYS = [0-9]+;/export const SERVICE_INTERVAL_DAYS = $i;/" src/lampLog.ts
    commit "retune the service interval ($i)"
  done
else
  printf '\nexport function lampCount(entries: readonly LampEntry[]): number {\n  return new Set(entries.map((entry) => entry.lampId)).size;\n}\n' >> src/lampLog.ts
  commit "add lampCount"
  printf '\nexport function nextDue(lastServiceDay: number): number {\n  return lastServiceDay + SERVICE_INTERVAL_DAYS;\n}\n' >> src/lampSchedule.ts
  commit "add nextDue"
fi
echo "history-repo: $(git rev-list --count HEAD) commits on $(git rev-parse --abbrev-ref HEAD)"
