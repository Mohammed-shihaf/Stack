"""Report MC/DC for the irrigation decision.

Same mechanism as Clean's driver, unchanged: enumerate the test cases the
suite uses and check whether each condition has an independence pair among
them -- two cases differing in that condition alone, with differing
decision outcomes. This project's test cases are chosen so that two of the
three conditions, `forecast_dry` and `override_on`, always change together
whenever they change at all, so neither ever gets an independence pair on
its own.
"""


import sys
from itertools import combinations
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from irrigation import FieldState, should_irrigate  # noqa: E402

CONDITIONS = ("moisture_low", "forecast_dry", "override_on")

CASES = (
    FieldState(moisture_low=True, forecast_dry=True, override_on=False),
    FieldState(moisture_low=False, forecast_dry=True, override_on=False),
    FieldState(moisture_low=True, forecast_dry=False, override_on=True),
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
        if should_irrigate(left) != should_irrigate(right):
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
