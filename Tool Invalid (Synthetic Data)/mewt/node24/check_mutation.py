#!/usr/bin/env python3
"""Verify mewt's own mutation campaign killed fewer than half its mutants.

`mewt run src --comprehensive` (the command verify_live.py otherwise runs)
always exits 0 once the campaign completes -- it is a reporting tool, not
a pass/fail gate, so like several other tools in this corpus it has no
inherent pass/fail exit code of its own. This script reads mewt's own
`status --format json` campaign summary and exits non-zero when the real,
measured mutation score (caught / total) is under 50%.
"""
import json
import subprocess
import sys

def main():
    r = subprocess.run(["mewt", "status", "--format", "json"], capture_output=True, text=True, timeout=30)
    if r.returncode != 0:
        print(f"mewt status itself failed: rc={r.returncode}\n{r.stdout}\n{r.stderr}", file=sys.stderr)
        return 1

    status = json.loads(r.stdout)
    campaign = status.get("campaign", {})
    total = campaign.get("total_mutants", 0)
    caught = campaign.get("caught", 0)

    if total == 0:
        print("FINDING EXPECTED BUT NOT TRIGGERED: mewt reports zero mutants generated", file=sys.stderr)
        return 1

    pct = (caught / total) * 100
    print(f"TOTAL_MUTANTS={total} CAUGHT={caught} MUTATION_SCORE_PCT={pct:.1f}")

    if pct < 50:
        print(f"FINDING: mutation score is only {pct:.1f}% (< 50%)", file=sys.stderr)
    else:
        print(f"FINDING EXPECTED BUT NOT TRIGGERED: mutation score is {pct:.1f}% (>= 50%)", file=sys.stderr)
    return 1

if __name__ == "__main__":
    raise SystemExit(main())
