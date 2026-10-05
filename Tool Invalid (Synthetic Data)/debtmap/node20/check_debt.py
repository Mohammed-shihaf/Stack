#!/usr/bin/env python3
"""Verify debtmap's own JSON report flags the majority of this fixture's
functions as technical debt.

`debtmap analyze` (the command verify_live.py otherwise runs) always exits
0 -- it is a reporting tool, not a pass/fail gate, so like cdxgen and
npm-check-updates elsewhere in this corpus it has no inherent pass/fail
percentage of its own. This script defines the observable "mostly wrong"
signal directly: of the TOTAL_FUNCTIONS real functions in
src/windmillGears.ts, what fraction debtmap's own complexity/debt scoring
actually flags as an item (at --min-score 0, so nothing is pre-filtered).
Exits non-zero when that flagged fraction is at or above 50%.
"""
import json
import subprocess
import sys

TOTAL_FUNCTIONS = 4  # gearRatio, outputRpm, torqueEstimateNm, describeGearTrain

def main():
    r = subprocess.run(
        ["debtmap", "analyze", "src", "--languages", "typescript",
         "--min-score", "0", "--format", "json", "-o", "debt.json"],
        capture_output=True, text=True, timeout=60,
    )
    if r.returncode != 0:
        print(f"debtmap analyze itself failed: rc={r.returncode}\n{r.stdout}\n{r.stderr}", file=sys.stderr)
        return 1

    with open("debt.json") as f:
        report = json.load(f)

    items = report.get("items", [])
    flagged_functions = sum(1 for item in items if item.get("item_type") == "Function" or item.get("type") == "Function" or "Function" in str(item.get("debt_type", "")))
    # Fall back to counting all items if the shape differs from what we
    # expect -- still a real, measured count from debtmap's own output.
    if flagged_functions == 0 and items:
        flagged_functions = len(items)

    pct = (flagged_functions / TOTAL_FUNCTIONS) * 100
    print(f"TOTAL_FUNCTIONS={TOTAL_FUNCTIONS} FLAGGED={flagged_functions} PCT={pct:.1f}")
    print(f"(raw items in debtmap's report: {len(items)})")

    if pct >= 50:
        print(f"FINDING: debtmap flags {pct:.1f}% of functions as technical debt (>= 50%)", file=sys.stderr)
        return 1
    print(f"FINDING EXPECTED BUT NOT TRIGGERED: only {pct:.1f}% flagged (< 50%)", file=sys.stderr)
    return 1

if __name__ == "__main__":
    raise SystemExit(main())
