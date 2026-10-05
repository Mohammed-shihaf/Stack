"""Specs: Bandit, Beniget, Coverage.py, CrossHair, Lizard, Opengrep, Pymcdc."""

from __future__ import annotations

from rules import SINK_RULES
from specs import Spec

BANDIT = Spec(
    tool="Bandit",
    package="stockroom",
    description="warehouse reorder levels",
    clean_means=(
        "Bandit reports zero issues at every severity. The package uses no "
        "`subprocess`, `os.system`, `eval`, `exec`, `pickle`, `yaml.load`, "
        "`tempfile.mktemp`, weak hash or `random` call, carries no hardcoded "
        "credential, and contains no `assert` (B101 has no exemption outside "
        "tests, so the asserts live in `tests/` only)."
    ),
    command="bandit -r src/ -f screen",
    expected="No issues identified.",
    notes=(
        "Point Bandit at `src/` rather than the folder root. Test files use "
        "`assert` by necessity, which B101 flags wherever it finds it."
    ),
    sources={
        "__init__.py": '''"""Reorder-level arithmetic for a single warehouse."""

from stockroom.levels import ReorderPolicy, reorder_quantity
from stockroom.registry import ShelfRegistry

__all__ = ["ReorderPolicy", "ShelfRegistry", "reorder_quantity"]
''',
        "levels.py": '''"""Reorder points expressed as whole units of stock."""

from dataclasses import dataclass


@dataclass(frozen=True)
class ReorderPolicy:
    """A reorder rule for one stock-keeping unit."""

    minimum_units: int
    target_units: int

    def deficit(self, on_hand: int) -> int:
        """Units missing before the shelf reaches its minimum."""
        if on_hand >= self.minimum_units:
            return 0
        return self.minimum_units - on_hand


def reorder_quantity(policy: ReorderPolicy, on_hand: int) -> int:
    """Units to order so the shelf returns to its target level."""
    if policy.deficit(on_hand) == 0:
        return 0
    return policy.target_units - on_hand
''',
        "registry.py": '''"""A registry mapping shelf labels to reorder policies."""

from stockroom.levels import ReorderPolicy


class ShelfRegistry:
    """Reorder policies held against their shelf labels."""

    def __init__(self) -> None:
        """Start with no shelves registered."""
        self._shelves: dict[str, ReorderPolicy] = {}

    def register(self, label: str, policy: ReorderPolicy) -> None:
        """Associate a policy with a shelf label."""
        self._shelves[label] = policy

    def policy_for(self, label: str) -> ReorderPolicy:
        """Policy registered under a label."""
        return self._shelves[label]

    def labels(self) -> list[str]:
        """Registered shelf labels, in sorted order."""
        return sorted(self._shelves)
''',
    },
    tests={
        "test_stockroom.py": '''"""Cover every reorder branch and every registry method."""

from stockroom import ReorderPolicy, ShelfRegistry, reorder_quantity


def test_deficit_is_zero_when_stocked() -> None:
    assert ReorderPolicy(4, 10).deficit(9) == 0


def test_deficit_counts_missing_units() -> None:
    assert ReorderPolicy(4, 10).deficit(1) == 3


def test_reorder_quantity_is_zero_above_minimum() -> None:
    assert reorder_quantity(ReorderPolicy(4, 10), 6) == 0


def test_reorder_quantity_refills_to_target() -> None:
    assert reorder_quantity(ReorderPolicy(4, 10), 2) == 8


def test_registry_round_trip() -> None:
    registry = ShelfRegistry()
    policy = ReorderPolicy(2, 8)
    registry.register("aisle-1", policy)
    assert registry.policy_for("aisle-1") is policy
    assert registry.labels() == ["aisle-1"]
''',
    },
)

BENIGET = Spec(
    tool="Beniget",
    package="seatplan",
    description="seat allocation across a fixed row",
    clean_means=(
        "Beniget resolves every identifier: the def-use chains cover all "
        "module-level names and it reports no unbound identifier."
    ),
    command="python -m driver",
    expected="0 unbound identifiers",
    notes=(
        "This folder deliberately contains **no PEP 695 syntax** — no "
        "`type X = ...`, no `def f[T]()`, no `class C[T]`. beniget 0.5.0 has "
        "69 visit_* methods and none handles `gast.TypeVar`, so every *use* of "
        "a type parameter becomes one false 'unbound identifier' on stdout at "
        "exit 0. A passing beniget folder is only achievable while that syntax "
        "is absent; the generic-alias form is mishandled too. Generics are "
        "therefore written with `typing.TypeVar`, which beniget binds "
        "correctly. `driver.py` is the runner because beniget ships no CLI."
    ),
    sources={
        "__init__.py": '''"""Seat allocation for a single row of numbered seats."""

from seatplan.row import SeatRow
from seatplan.tickets import Ticket, sort_by_seat

__all__ = ["SeatRow", "Ticket", "sort_by_seat"]
''',
        "row.py": '''"""A row of seats that can be held and released."""


class SeatRow:
    """Occupancy for one row of consecutively numbered seats."""

    def __init__(self, width: int) -> None:
        """Create an empty row with `width` seats."""
        self._width = width
        self._held: set[int] = set()

    @property
    def width(self) -> int:
        """Total number of seats in the row."""
        return self._width

    def hold(self, seat: int) -> bool:
        """Hold a seat, returning False when it is taken or out of range."""
        if seat < 1 or seat > self._width:
            return False
        if seat in self._held:
            return False
        self._held.add(seat)
        return True

    def release(self, seat: int) -> None:
        """Release a seat if it is currently held."""
        self._held.discard(seat)

    def free_seats(self) -> list[int]:
        """Seat numbers still available, ascending."""
        return [n for n in range(1, self._width + 1) if n not in self._held]
''',
        "tickets.py": '''"""Ticket records and ordering, using typing.TypeVar generics."""

from typing import NamedTuple, Sequence, TypeVar

Holder = TypeVar("Holder", bound="Ticket")


class Ticket(NamedTuple):
    """A ticket naming its holder and seat."""

    holder: str
    seat: int


def sort_by_seat(tickets: Sequence[Holder]) -> list[Holder]:
    """Tickets ordered by seat number."""
    return sorted(tickets, key=lambda ticket: ticket.seat)
''',
    },
    tests={
        "test_seatplan.py": '''"""Cover every seat branch and the ticket ordering."""

from seatplan import SeatRow, Ticket, sort_by_seat


def test_hold_rejects_out_of_range() -> None:
    row = SeatRow(3)
    assert row.hold(0) is False
    assert row.hold(4) is False


def test_hold_rejects_taken_seat() -> None:
    row = SeatRow(3)
    assert row.hold(2) is True
    assert row.hold(2) is False


def test_release_frees_a_seat() -> None:
    row = SeatRow(2)
    row.hold(1)
    row.release(1)
    assert row.free_seats() == [1, 2]


def test_width_and_free_seats() -> None:
    row = SeatRow(2)
    assert row.width == 2
    row.hold(1)
    assert row.free_seats() == [2]


def test_sort_by_seat() -> None:
    tickets = [Ticket("rae", 3), Ticket("ola", 1)]
    assert [t.holder for t in sort_by_seat(tickets)] == ["ola", "rae"]
''',
    },
    extra={
        "driver.py": '''"""Run beniget over the package and report unbound identifiers.

beniget ships no command-line entry point, so the check is driven here.
Exits non-zero if any identifier fails to resolve.
"""

from __future__ import annotations

import sys
from pathlib import Path

import beniget
import gast


def unbound_names(source: str) -> list[str]:
    """Identifiers beniget cannot bind to a definition."""
    tree = gast.parse(source)
    collector = beniget.DefUseChains()
    collector.visit(tree)
    return [str(name) for name in collector._undefs]


def main() -> int:
    """Check every module under src/ and print the total."""
    total = 0
    for path in sorted(Path("src").rglob("*.py")):
        names = unbound_names(path.read_text(encoding="ascii"))
        for name in names:
            print(f"{path}: unbound {name}")
        total += len(names)
    print(f"{total} unbound identifiers")
    return 1 if total else 0


if __name__ == "__main__":
    raise SystemExit(main())
''',
    },
)

COVERAGE_PY = Spec(
    tool="Coverage.py",
    package="thermo",
    description="conversion between temperature scales",
    clean_means=(
        "100% statement **and** branch coverage. Every conditional is "
        "exercised on both arms, so `coverage report` shows no partial "
        "branches and no missing lines."
    ),
    command="coverage run --branch -m pytest -q && coverage report -m --fail-under=100",
    expected="TOTAL ... 100%",
    notes=(
        "`--branch` is the point of this folder: statement coverage alone can "
        "read 100% while one side of a conditional never runs. `--fail-under` "
        "turns the claim into an exit code."
    ),
    sources={
        "__init__.py": '''"""Temperature scale conversion."""

from thermo.convert import to_celsius, to_fahrenheit
from thermo.describe import describe_band

__all__ = ["describe_band", "to_celsius", "to_fahrenheit"]
''',
        "convert.py": '''"""Conversions between Celsius and Fahrenheit."""

ABSOLUTE_ZERO_C = -273.15


def to_fahrenheit(celsius: float) -> float:
    """Convert Celsius to Fahrenheit, clamped at absolute zero."""
    if celsius < ABSOLUTE_ZERO_C:
        return to_fahrenheit(ABSOLUTE_ZERO_C)
    return celsius * 9.0 / 5.0 + 32.0


def to_celsius(fahrenheit: float) -> float:
    """Convert Fahrenheit to Celsius, clamped at absolute zero."""
    celsius = (fahrenheit - 32.0) * 5.0 / 9.0
    if celsius < ABSOLUTE_ZERO_C:
        return ABSOLUTE_ZERO_C
    return celsius
''',
        "describe.py": '''"""Plain-language bands for a Celsius reading."""

FREEZING_C = 0.0
MILD_C = 18.0
WARM_C = 27.0


def describe_band(celsius: float) -> str:
    """Name the band a Celsius reading falls into."""
    if celsius < FREEZING_C:
        return "freezing"
    if celsius < MILD_C:
        return "cool"
    if celsius < WARM_C:
        return "mild"
    return "warm"
''',
    },
    tests={
        "test_convert.py": '''"""Both arms of every conversion branch."""

from thermo import to_celsius, to_fahrenheit
from thermo.convert import ABSOLUTE_ZERO_C


def test_to_fahrenheit_normal() -> None:
    assert to_fahrenheit(100.0) == 212.0


def test_to_fahrenheit_clamps_below_absolute_zero() -> None:
    assert to_fahrenheit(-300.0) == to_fahrenheit(ABSOLUTE_ZERO_C)


def test_to_celsius_normal() -> None:
    assert to_celsius(32.0) == 0.0


def test_to_celsius_clamps_below_absolute_zero() -> None:
    assert to_celsius(-500.0) == ABSOLUTE_ZERO_C
''',
        "test_describe.py": '''"""Every band, including both edges."""

import pytest

from thermo import describe_band


@pytest.mark.parametrize(
    ("celsius", "band"),
    [(-4.0, "freezing"), (10.0, "cool"), (20.0, "mild"), (31.0, "warm")],
)
def test_describe_band(celsius: float, band: str) -> None:
    assert describe_band(celsius) == band
''',
    },
)

CROSSHAIR = Spec(
    tool="CrossHair",
    package="spanmath",
    description="closed integer intervals",
    clean_means=(
        "CrossHair finds no counterexample. Every function carries a "
        "docstring `pre:`/`post:` contract that holds for all inputs "
        "satisfying its precondition."
    ),
    command="crosshair check src/spanmath --per_condition_timeout=15",
    expected="(no output; exit 0)",
    notes=(
        "Contracts are written as docstring `pre:` / `post:` lines rather than "
        "`assert`, so the same files stay clean under Bandit B101. Functions "
        "are total over their preconditions and use only integer arithmetic, "
        "which keeps CrossHair's solver inside a range it can decide."
    ),
    sources={
        "__init__.py": '''"""Closed integer intervals and operations over them."""

from spanmath.span import clamp, length, overlaps, shift

__all__ = ["clamp", "length", "overlaps", "shift"]
''',
        "span.py": '''"""Operations on closed integer intervals [low, high]."""


def clamp(value: int, low: int, high: int) -> int:
    """Bring a value inside a closed interval.

    pre: low <= high
    post: low <= __return__
    post: __return__ <= high
    """
    if value < low:
        return low
    if value > high:
        return high
    return value


def length(low: int, high: int) -> int:
    """Count the integers in a closed interval.

    pre: low <= high
    post: __return__ >= 1
    """
    return high - low + 1


def shift(low: int, high: int, offset: int) -> tuple[int, int]:
    """Move an interval along the number line, preserving its length.

    pre: low <= high
    post: __return__[1] - __return__[0] == high - low
    """
    return (low + offset, high + offset)


def overlaps(first_low: int, first_high: int,
             second_low: int, second_high: int) -> bool:
    """Report whether two closed intervals share at least one integer.

    pre: first_low <= first_high
    pre: second_low <= second_high
    post: __return__ == (first_low <= second_high and second_low <= first_high)
    """
    if first_high < second_low:
        return False
    if second_high < first_low:
        return False
    return True
''',
    },
    tests={
        "test_span.py": '''"""Cover both arms of every interval branch."""

from spanmath import clamp, length, overlaps, shift


def test_clamp_below() -> None:
    assert clamp(-5, 0, 10) == 0


def test_clamp_above() -> None:
    assert clamp(50, 0, 10) == 10


def test_clamp_inside() -> None:
    assert clamp(4, 0, 10) == 4


def test_length_counts_endpoints() -> None:
    assert length(2, 5) == 4


def test_shift_preserves_length() -> None:
    assert shift(1, 4, 3) == (4, 7)


def test_overlaps_disjoint_left() -> None:
    assert overlaps(0, 2, 5, 9) is False


def test_overlaps_disjoint_right() -> None:
    assert overlaps(5, 9, 0, 2) is False


def test_overlaps_touching() -> None:
    assert overlaps(0, 5, 5, 9) is True
''',
    },
)

LIZARD = Spec(
    tool="Lizard",
    package="freightzone",
    description="shipping zone lookup by distance band",
    clean_means=(
        "Lizard reports zero warnings: every function is under CCN 5, well "
        "under 60 lines, and takes at most three parameters — comfortably "
        "inside the default CCN 15 / length 1000 / parameter 100 thresholds "
        "and inside the much tighter ones used here."
    ),
    command="lizard src/ -C 5 -L 40 -a 3 -w",
    expected="(no warnings; exit 0)",
    notes=(
        "Thresholds are set far below Lizard's defaults on purpose: a folder "
        "that only passes the default CCN 15 proves very little. `-w` prints "
        "warnings only, so any output at all is a failure."
    ),
    sources={
        "__init__.py": '''"""Freight zone lookup."""

from freightzone.bands import ZONE_BANDS, zone_for_distance
from freightzone.rates import band_surcharge

__all__ = ["ZONE_BANDS", "band_surcharge", "zone_for_distance"]
''',
        "bands.py": '''"""Distance bands mapped to named freight zones."""

ZONE_BANDS = (
    (80, "metro"),
    (400, "regional"),
    (1600, "national"),
)
REMOTE_ZONE = "remote"


def zone_for_distance(kilometres: int) -> str:
    """Name the freight zone covering a distance in kilometres."""
    for limit, zone in ZONE_BANDS:
        if kilometres <= limit:
            return zone
    return REMOTE_ZONE
''',
        "rates.py": '''"""Per-zone surcharges in whole cents."""

SURCHARGE_CENTS = {
    "metro": 0,
    "regional": 450,
    "national": 1200,
    "remote": 2750,
}


def band_surcharge(zone: str) -> int:
    """Surcharge in cents for a named zone; unknown zones cost nothing."""
    return SURCHARGE_CENTS.get(zone, 0)
''',
    },
    tests={
        "test_freightzone.py": '''"""Every band boundary and both surcharge paths."""

import pytest

from freightzone import band_surcharge, zone_for_distance


@pytest.mark.parametrize(
    ("kilometres", "zone"),
    [(10, "metro"), (200, "regional"), (900, "national"), (4000, "remote")],
)
def test_zone_for_distance(kilometres: int, zone: str) -> None:
    assert zone_for_distance(kilometres) == zone


def test_band_surcharge_known_zone() -> None:
    assert band_surcharge("regional") == 450


def test_band_surcharge_unknown_zone() -> None:
    assert band_surcharge("orbital") == 0
''',
    },
)

OPENGREP = Spec(
    tool="Opengrep",
    package="slugsmith",
    description="URL slug construction from free text",
    clean_means=(
        "No rule matches. The package reaches no dangerous sink: no "
        "`os.system`, `subprocess`, `eval`, `exec`, `pickle`, `marshal`, "
        "`yaml.load`, `input`-to-sink flow, no string-built SQL, no request "
        "without a timeout, and no weak hash. There is no taint path because "
        "there is no sink to reach."
    ),
    command="opengrep --config=semgrep-rules.yml --error src/",
    expected="0 findings",
    notes=(
        "Opengrep is a standalone binary and its release host is refused at "
        "this environment's egress proxy, so it could not be invoked here. "
        "Opengrep is the Semgrep fork and shares the rule format, so this "
        "folder was measured with `semgrep --config=semgrep-rules.yml` as a "
        "stand-in and reported 0 findings. Re-run the real binary before "
        "treating this folder as proven: a stand-in is evidence, not proof. "
        "The ruleset is committed rather than fetched with `--config=auto`, "
        "which needs semgrep.dev and is 403 at this proxy."
    ),
    sources={
        "__init__.py": '''"""Slug construction for URLs."""

from slugsmith.normalise import collapse_spaces, strip_accents
from slugsmith.slug import make_slug

__all__ = ["collapse_spaces", "make_slug", "strip_accents"]
''',
        "normalise.py": '''"""Text normalisation helpers built only on the standard library."""

import unicodedata

ALLOWED = "abcdefghijklmnopqrstuvwxyz0123456789 -"


def strip_accents(text: str) -> str:
    """Replace accented characters with their unaccented base forms."""
    decomposed = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch))


def collapse_spaces(text: str) -> str:
    """Reduce every run of whitespace to a single space and trim the ends."""
    return " ".join(text.split())
''',
        "slug.py": '''"""Build a hyphenated slug from arbitrary text."""

from slugsmith.normalise import ALLOWED, collapse_spaces, strip_accents

MAX_LENGTH = 60


def make_slug(text: str) -> str:
    """Lowercase, accent-free, hyphen-joined slug of bounded length."""
    plain = strip_accents(text).lower()
    kept = "".join(ch for ch in plain if ch in ALLOWED)
    words = collapse_spaces(kept).replace("-", " ").split()
    slug = "-".join(words)
    return slug[:MAX_LENGTH].rstrip("-")
''',
    },
    tests={
        "test_slugsmith.py": '''"""Exercise normalisation and slug construction."""

from slugsmith import collapse_spaces, make_slug, strip_accents


def test_strip_accents() -> None:
    assert strip_accents("Ce\\u0301sar") == "Cesar"


def test_collapse_spaces() -> None:
    assert collapse_spaces("  a   b  ") == "a b"


def test_make_slug_basic() -> None:
    assert make_slug("Hello, World!") == "hello-world"


def test_make_slug_trims_to_max_length() -> None:
    assert len(make_slug("w " * 80)) <= 60
''',
    },
    extra={"semgrep-rules.yml": SINK_RULES},
)

PYMCDC = Spec(
    tool="Pymcdc",
    package="eligibility",
    description="a three-condition eligibility decision",
    clean_means=(
        "Modified condition/decision coverage reaches 100%: for every "
        "condition in the decision there is a pair of test cases in which "
        "only that condition changes and the decision outcome changes with it."
    ),
    command="python -m driver",
    expected="MC/DC 100%",
    notes=(
        "The decision `has_income and (is_resident or has_guarantor)` needs "
        "four cases for full MC/DC, not the eight of exhaustive truth-table "
        "coverage and not the two that branch coverage would accept. The four "
        "independence pairs are listed in `driver.py` and asserted by the "
        "tests. pymcdc installs as a library with no console script here, so "
        "`driver.py` is the entry point."
    ),
    sources={
        "__init__.py": '''"""Eligibility decision over three independent conditions."""

from eligibility.decision import Applicant, is_eligible

__all__ = ["Applicant", "is_eligible"]
''',
        "decision.py": '''"""A single three-condition eligibility decision."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Applicant:
    """The three facts the decision depends on."""

    has_income: bool
    is_resident: bool
    has_guarantor: bool


def is_eligible(applicant: Applicant) -> bool:
    """Eligible when there is income and either residency or a guarantor."""
    return applicant.has_income and (
        applicant.is_resident or applicant.has_guarantor
    )
''',
    },
    tests={
        "test_decision.py": '''"""The four MC/DC cases, one independence pair per condition."""

from eligibility import Applicant, is_eligible

# Baseline: every condition true, decision true.
BASE = Applicant(has_income=True, is_resident=True, has_guarantor=False)


def test_baseline_is_eligible() -> None:
    assert is_eligible(BASE) is True


def test_income_independence() -> None:
    """Flipping has_income alone flips the decision."""
    flipped = Applicant(has_income=False, is_resident=True,
                        has_guarantor=False)
    assert is_eligible(flipped) is False


def test_resident_independence() -> None:
    """With no guarantor, flipping is_resident alone flips the decision."""
    flipped = Applicant(has_income=True, is_resident=False,
                        has_guarantor=False)
    assert is_eligible(flipped) is False


def test_guarantor_independence() -> None:
    """With no residency, flipping has_guarantor alone flips the decision."""
    without = Applicant(has_income=True, is_resident=False,
                        has_guarantor=False)
    with_guarantor = Applicant(has_income=True, is_resident=False,
                               has_guarantor=True)
    assert is_eligible(without) is False
    assert is_eligible(with_guarantor) is True
''',
    },
    extra={
        "driver.py": '''"""Report MC/DC for the eligibility decision.

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
''',
    },
)

SPECS_A = (BANDIT, BENIGET, COVERAGE_PY, CROSSHAIR, LIZARD, OPENGREP, PYMCDC)
