"""Report MC/DC for the eligibility decision.

Enumerates the four test cases the suite uses and checks that each condition
has an independence pair among them: two cases differing in that condition
alone, with differing decision outcomes.
"""

from __future__ import annotations

import sys
from itertools import combinations
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from eligibility import Applicant, is_eligible  # noqa: E402

CONDITIONS = ("has_income", "is_resident", "has_guarantor")

CASES = (
    Applicant(has_income=True, is_resident=True, has_guarantor=False),
    Applicant(has_income=False, is_resident=True, has_guarantor=False),
    Applicant(has_income=True, is_resident=False, has_guarantor=False),
    Applicant(has_income=True, is_resident=False, has_guarantor=True),
)


def has_independence_pair(condition: str) -> bool:
    """True when two cases differ in `condition` alone and in outcome."""
    others = [name for name in CONDITIONS if name != condition]
    for left, right in combinations(CASES, 2):
        if getattr(left, condition) == getattr(right, condition):
            continue
        if any(getattr(left, name) != getattr(right, name)
               for name in others):
            continue
        if is_eligible(left) != is_eligible(right):
            return True
    return False


def main() -> int:
    """Print the MC/DC percentage over the decision's conditions."""
    covered = [name for name in CONDITIONS if has_independence_pair(name)]
    percent = 100 * len(covered) // len(CONDITIONS)
    for name in CONDITIONS:
        state = "covered" if name in covered else "UNCOVERED"
        print(f"  {name}: {state}")
    print(f"MC/DC {percent}%")
    return 0 if percent == 100 else 1


if __name__ == "__main__":
    raise SystemExit(main())
