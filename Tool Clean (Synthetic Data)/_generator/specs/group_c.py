"""Specs: complexipy, cosmic-ray, diff-cover, dulwich, jscpd, mutmut, pip-audit."""

from __future__ import annotations

from specs import Spec

COMPLEXIPY = Spec(
    tool="complexipy",
    package="gridwalk",
    description="neighbour lookup on a bounded grid",
    clean_means=(
        "Every function scores at or below the configured maximum cognitive "
        "complexity, so `complexipy` exits 0 with no function listed over "
        "budget."
    ),
    command="complexipy src/ --max-complexity-allowed 8",
    expected="all functions within budget; exit 0",
    notes=(
        "Neighbour lookup is normally written as a doubly nested loop with a "
        "bounds check and a self-exclusion check inside it — three nesting "
        "increments on the innermost condition. Precomputing the offsets and "
        "filtering once flattens it to a single comprehension. Note the flag "
        "spelling: complexipy 8.x renamed `-mx` to "
        "`--max-complexity-allowed`."
    ),
    sources={
        "__init__.py": '''"""Neighbour lookup on a bounded rectangular grid."""

from gridwalk.grid import Grid
from gridwalk.offsets import ORTHOGONAL, SURROUNDING

__all__ = ["ORTHOGONAL", "SURROUNDING", "Grid"]
''',
        "offsets.py": '''"""Precomputed neighbour offsets, so lookups need no nested loops."""

ORTHOGONAL = ((-1, 0), (1, 0), (0, -1), (0, 1))

SURROUNDING = (
    (-1, -1), (-1, 0), (-1, 1),
    (0, -1), (0, 1),
    (1, -1), (1, 0), (1, 1),
)
''',
        "grid.py": '''"""A bounded grid addressed by (row, column)."""

from typing import Iterable, Sequence

from gridwalk.offsets import ORTHOGONAL, SURROUNDING


class Grid:
    """A rectangular grid of fixed extent."""

    def __init__(self, rows: int, columns: int) -> None:
        """Create a grid with the given extent."""
        self.rows = rows
        self.columns = columns

    def contains(self, row: int, column: int) -> bool:
        """Whether a coordinate lies inside the grid."""
        return 0 <= row < self.rows and 0 <= column < self.columns

    def _shifted(self, row: int, column: int,
                 offsets: Sequence[tuple[int, int]]) -> Iterable[tuple[int, int]]:
        """Coordinates reached by applying each offset, unfiltered."""
        return ((row + dr, column + dc) for dr, dc in offsets)

    def orthogonal_neighbours(self, row: int,
                              column: int) -> list[tuple[int, int]]:
        """In-bounds neighbours sharing an edge."""
        moved = self._shifted(row, column, ORTHOGONAL)
        return [(r, c) for r, c in moved if self.contains(r, c)]

    def surrounding_neighbours(self, row: int,
                               column: int) -> list[tuple[int, int]]:
        """In-bounds neighbours sharing an edge or a corner."""
        moved = self._shifted(row, column, SURROUNDING)
        return [(r, c) for r, c in moved if self.contains(r, c)]
''',
    },
    tests={
        "test_gridwalk.py": '''"""Cover bounds checking at the edges and both neighbour sets."""

from gridwalk import ORTHOGONAL, SURROUNDING, Grid


def test_offset_counts() -> None:
    assert len(ORTHOGONAL) == 4
    assert len(SURROUNDING) == 8


def test_contains_inside_and_outside() -> None:
    grid = Grid(2, 2)
    assert grid.contains(1, 1) is True
    assert grid.contains(2, 0) is False
    assert grid.contains(-1, 0) is False
    assert grid.contains(0, 2) is False


def test_orthogonal_neighbours_at_corner() -> None:
    assert sorted(Grid(2, 2).orthogonal_neighbours(0, 0)) == [(0, 1), (1, 0)]


def test_surrounding_neighbours_at_corner() -> None:
    found = sorted(Grid(2, 2).surrounding_neighbours(0, 0))
    assert found == [(0, 1), (1, 0), (1, 1)]
''',
    },
)

COSMIC_RAY = Spec(
    tool="cosmic-ray",
    package="flagset",
    description="bit-flag set operations",
    clean_means=(
        "Every mutant is killed: the surviving-mutant count is zero, so the "
        "mutation score is 100%. Each function is total over a small integer "
        "domain and the suite tests that domain exhaustively, which leaves a "
        "mutated operator or constant nowhere to hide."
    ),
    command=("cosmic-ray init cosmic-ray.toml session.sqlite && "
             "cosmic-ray exec cosmic-ray.toml session.sqlite && "
             "cr-report session.sqlite"),
    expected="survival rate: 0.00%",
    notes=(
        "cosmic-ray could not be installed in this environment — its "
        "dependency chain hits a setuptools `install_layout` incompatibility "
        "in the container's Python, so pip cannot build a wheel. The folder "
        "ships its complete configuration and the exhaustive suite, but the "
        "mutation score here is **unverified**; run it on a host where the "
        "install succeeds. Exhaustive testing over a bounded domain is what "
        "makes 100% reachable rather than aspirational — equivalent mutants "
        "are the usual reason a score stalls below it."
    ),
    sources={
        "__init__.py": '''"""Bit-flag set operations over a four-bit domain."""

from flagset.flags import ALL_FLAGS, WIDTH, clear, is_set, toggle

__all__ = ["ALL_FLAGS", "WIDTH", "clear", "is_set", "toggle"]
''',
        "flags.py": '''"""Operations on a four-bit flag word."""

WIDTH = 4
ALL_FLAGS = (1 << WIDTH) - 1


def is_set(word: int, position: int) -> bool:
    """Whether the bit at `position` is set in `word`."""
    return word & (1 << position) != 0


def toggle(word: int, position: int) -> int:
    """Flip the bit at `position`, keeping the word inside the domain."""
    return (word ^ (1 << position)) & ALL_FLAGS


def clear(word: int, position: int) -> int:
    """Unset the bit at `position`."""
    return word & ~(1 << position) & ALL_FLAGS
''',
    },
    tests={
        "test_flags.py": '''"""Exhaustive over every word and position in the domain."""

import pytest

from flagset import ALL_FLAGS, WIDTH, clear, is_set, toggle

WORDS = range(ALL_FLAGS + 1)
POSITIONS = range(WIDTH)


def test_domain_constants() -> None:
    assert WIDTH == 4
    assert ALL_FLAGS == 15


@pytest.mark.parametrize("word", WORDS)
@pytest.mark.parametrize("position", POSITIONS)
def test_is_set_matches_shift(word: int, position: int) -> None:
    expected = bool(word // (2 ** position) % 2)
    assert is_set(word, position) is expected


@pytest.mark.parametrize("word", WORDS)
@pytest.mark.parametrize("position", POSITIONS)
def test_toggle_flips_exactly_one_bit(word: int, position: int) -> None:
    flipped = toggle(word, position)
    assert is_set(flipped, position) is not is_set(word, position)
    others = [p for p in POSITIONS if p != position]
    assert all(is_set(flipped, p) is is_set(word, p) for p in others)


@pytest.mark.parametrize("word", WORDS)
@pytest.mark.parametrize("position", POSITIONS)
def test_clear_unsets_and_preserves(word: int, position: int) -> None:
    cleared = clear(word, position)
    assert is_set(cleared, position) is False
    others = [p for p in POSITIONS if p != position]
    assert all(is_set(cleared, p) is is_set(word, p) for p in others)
''',
    },
    extra={
        "cosmic-ray.toml": '''[cosmic-ray]
module-path = "src/flagset"
timeout = 30.0
excluded-modules = []
test-command = "python -m pytest -x -q"

[cosmic-ray.distributor]
name = "local"
''',
    },
)

DIFF_COVER = Spec(
    tool="diff-cover",
    package="reportlines",
    description="line-oriented report rendering",
    clean_means=(
        "Diff coverage is 100%: every executable line changed on the branch is "
        "covered by the suite, so `diff-cover` reports no missing lines and "
        "`--fail-under=100` exits 0."
    ),
    command=("coverage run --branch -m pytest -q && coverage xml && "
             "diff-cover coverage.xml --compare-branch=main --fail-under=100"),
    expected="Diff coverage: 100%",
    notes=(
        "The folder is a real git repository with a `main` base and a "
        "`feature` branch, because diff-cover needs a diff to report on. The "
        "feature commit adds an executable function **and its test in the same "
        "commit** — adding covered-looking code without its test is how a "
        "diff-coverage gate is accidentally satisfied by a diff containing "
        "nothing executable at all."
    ),
    needs_git=True,
    needs_diff_branch=True,
    sources={
        "__init__.py": '''"""Line-oriented rendering of short reports."""

from reportlines.render import render_lines
from reportlines.width import fit_to_width

__all__ = ["fit_to_width", "render_lines"]
''',
        "width.py": '''"""Fitting text into a fixed column width."""

ELLIPSIS = "..."


def fit_to_width(text: str, width: int) -> str:
    """Trim text to `width` columns, marking truncation with an ellipsis."""
    if len(text) <= width:
        return text
    if width <= len(ELLIPSIS):
        return text[:width]
    return text[: width - len(ELLIPSIS)] + ELLIPSIS
''',
        "render.py": '''"""Rendering a sequence of label/value pairs as aligned lines."""

from typing import Sequence

from reportlines.width import fit_to_width


def render_lines(pairs: Sequence[tuple[str, str]], width: int) -> list[str]:
    """Render pairs as `label: value` lines, each fitted to `width`."""
    if not pairs:
        return []
    label_width = max(len(label) for label, _ in pairs)
    lines = []
    for label, value in pairs:
        line = f"{label.ljust(label_width)}: {value}"
        lines.append(fit_to_width(line, width))
    return lines
''',
    },
    tests={
        "test_reportlines.py": '''"""Cover every width and render branch."""

from reportlines import fit_to_width, render_lines


def test_fit_to_width_leaves_short_text() -> None:
    assert fit_to_width("ab", 5) == "ab"


def test_fit_to_width_truncates_with_ellipsis() -> None:
    assert fit_to_width("abcdefgh", 6) == "abc..."


def test_fit_to_width_narrower_than_ellipsis() -> None:
    assert fit_to_width("abcdefgh", 2) == "ab"


def test_render_lines_aligns_labels() -> None:
    lines = render_lines([("a", "1"), ("bbb", "2")], 40)
    assert lines == ["a  : 1", "bbb: 2"]


def test_render_lines_empty() -> None:
    assert render_lines([], 10) == []
''',
    },
    diff_files={
        "src/reportlines/width.py": '''

def pad_to_width(text: str, width: int) -> str:
    """Pad text with spaces up to `width`, leaving longer text untouched."""
    if len(text) >= width:
        return text
    return text + " " * (width - len(text))
''',
        "tests/test_reportlines.py": '''

def test_pad_to_width_pads_short_text() -> None:
    from reportlines.width import pad_to_width

    assert pad_to_width("ab", 4) == "ab  "


def test_pad_to_width_leaves_long_text() -> None:
    from reportlines.width import pad_to_width

    assert pad_to_width("abcd", 2) == "abcd"
''',
    },
)

DULWICH = Spec(
    tool="dulwich",
    package="notekeeper",
    description="release note collection",
    clean_means=(
        "dulwich opens the repository, walks the full history and resolves "
        "every commit, tree and blob without error, and the commit and author "
        "counts it reports agree with `git log`."
    ),
    command="python -m driver",
    expected="history readable: N commits, 3 authors",
    notes=(
        "A history tool's clean result is a well-formed repository, not an "
        "absence of findings. The generated history has three distinct authors "
        "so an ownership calculation has something to divide, and every commit "
        "touches exactly one file so churn is attributable. The corpora found "
        "that a history parser splitting each record on the first newline "
        "collapses 40 commits to 1 and reports a single author at 100% — this "
        "repository is shaped to make that failure visible."
    ),
    needs_git=True,
    sources={
        "__init__.py": '''"""Collection and formatting of release notes."""

from notekeeper.notes import Note, group_by_kind
from notekeeper.format import format_section

__all__ = ["Note", "format_section", "group_by_kind"]
''',
        "notes.py": '''"""Release notes and their grouping."""

from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True)
class Note:
    """One release note: a kind and a one-line summary."""

    kind: str
    summary: str


def group_by_kind(notes: Sequence[Note]) -> dict[str, list[str]]:
    """Group note summaries under their kind, preserving input order."""
    grouped: dict[str, list[str]] = {}
    for note in notes:
        grouped.setdefault(note.kind, []).append(note.summary)
    return grouped
''',
        "format.py": '''"""Formatting a grouped section of release notes."""

from typing import Sequence

BULLET = "- "


def format_section(heading: str, summaries: Sequence[str]) -> str:
    """Render a heading and its bulleted summaries as one block of text."""
    if not summaries:
        return f"## {heading}\\n\\n(nothing recorded)"
    bullets = "\\n".join(BULLET + summary for summary in summaries)
    return f"## {heading}\\n\\n{bullets}"
''',
    },
    tests={
        "test_notekeeper.py": '''"""Cover grouping and both formatting branches."""

from notekeeper import Note, format_section, group_by_kind


def test_group_by_kind_preserves_order() -> None:
    notes = [Note("fixed", "a"), Note("added", "b"), Note("fixed", "c")]
    assert group_by_kind(notes) == {"fixed": ["a", "c"], "added": ["b"]}


def test_format_section_with_summaries() -> None:
    text = format_section("Fixed", ["a", "b"])
    assert text == "## Fixed\\n\\n- a\\n- b"


def test_format_section_without_summaries() -> None:
    assert format_section("Fixed", []) == "## Fixed\\n\\n(nothing recorded)"
''',
    },
    extra={
        "driver.py": '''"""Walk the repository history with dulwich and report what it found.

Counts commits and distinct authors, counting the author field only — a
trailer-aware count is the orchestrator's job, and conflating the two is how
an ownership metric silently reports one author at 100%.
"""

from __future__ import annotations

from dulwich.repo import Repo


def main() -> int:
    """Open the repository, walk every commit, and print the totals."""
    with Repo(".") as repo:
        commits = list(repo.get_walker())
        authors = set()
        for entry in commits:
            authors.add(entry.commit.author.decode("utf-8"))
            # Resolving the tree proves the object store is intact.
            repo[entry.commit.tree]
    print(f"history readable: {len(commits)} commits, {len(authors)} authors")
    return 0 if commits and authors else 1


if __name__ == "__main__":
    raise SystemExit(main())
''',
    },
)

JSCPD = Spec(
    tool="jscpd",
    package="unitcast",
    description="three unrelated unit converters",
    clean_means=(
        "Zero clones. jscpd finds no duplicated block at its default "
        "threshold, and none at the much tighter settings used here (5 lines / "
        "30 tokens), because the three converter modules share no structure: "
        "one is a lookup table, one is a ratio chain, one is a parser."
    ),
    command="jscpd src/ --min-lines 5 --min-tokens 30 --threshold 0 --reporters console",
    expected="Found 0 clones",
    notes=(
        "The natural way to write three converters is one shape repeated three "
        "times, which is exactly a clone group. Each module here is "
        "deliberately a different shape. Note `--threshold 0`: jscpd's "
        "threshold is a **failure budget**, not a detection floor, so 0 means "
        "any clone at all fails the run."
    ),
    sources={
        "__init__.py": '''"""Three unit converters, each written in a different style."""

from unitcast.lookup import to_millimetres
from unitcast.ratio import celsius_to_kelvin, kelvin_to_celsius
from unitcast.parser import parse_duration_seconds

__all__ = [
    "celsius_to_kelvin",
    "kelvin_to_celsius",
    "parse_duration_seconds",
    "to_millimetres",
]
''',
        "lookup.py": '''"""Length conversion by table lookup."""

PER_MILLIMETRE = {
    "mm": 1.0,
    "cm": 10.0,
    "m": 1000.0,
    "in": 25.4,
    "ft": 304.8,
}


def to_millimetres(value: float, unit: str) -> float:
    """Convert a length to millimetres; unknown units raise."""
    factor = PER_MILLIMETRE.get(unit)
    if factor is None:
        raise KeyError(unit)
    return value * factor
''',
        "ratio.py": '''"""Temperature conversion as an offset pair, with no table involved."""

KELVIN_OFFSET = 273.15


def celsius_to_kelvin(celsius: float) -> float:
    """Shift a Celsius reading onto the Kelvin scale."""
    return celsius + KELVIN_OFFSET


def kelvin_to_celsius(kelvin: float) -> float:
    """Shift a Kelvin reading onto the Celsius scale."""
    return kelvin - KELVIN_OFFSET
''',
        "parser.py": '''"""Duration conversion by scanning a compact ``1h30m`` string."""

SECONDS = {"h": 3600, "m": 60, "s": 1}


def parse_duration_seconds(text: str) -> int:
    """Total seconds in a compact duration such as ``1h30m``."""
    total = 0
    digits = ""
    for character in text:
        if character.isdigit():
            digits += character
        elif character in SECONDS and digits:
            total += int(digits) * SECONDS[character]
            digits = ""
        else:
            raise ValueError(text)
    if digits:
        raise ValueError(text)
    return total
''',
    },
    tests={
        "test_lookup.py": '''"""Length lookup, both branches."""

import pytest

from unitcast import to_millimetres


def test_known_unit() -> None:
    assert to_millimetres(2.0, "cm") == 20.0


def test_unknown_unit() -> None:
    with pytest.raises(KeyError):
        to_millimetres(1.0, "league")
''',
        "test_ratio.py": '''"""Temperature offsets, both directions."""

from unitcast import celsius_to_kelvin, kelvin_to_celsius


def test_celsius_to_kelvin() -> None:
    assert celsius_to_kelvin(0.0) == 273.15


def test_kelvin_to_celsius() -> None:
    assert kelvin_to_celsius(273.15) == 0.0
''',
        "test_parser.py": '''"""Duration parsing, including both failure paths."""

import pytest

from unitcast import parse_duration_seconds


def test_parses_compound_duration() -> None:
    assert parse_duration_seconds("1h30m") == 5400


def test_rejects_unknown_character() -> None:
    with pytest.raises(ValueError):
        parse_duration_seconds("1x")


def test_rejects_trailing_digits() -> None:
    with pytest.raises(ValueError):
        parse_duration_seconds("90")
''',
    },
)

MUTMUT = Spec(
    tool="mutmut",
    package="roundkit",
    description="rounding helpers over a small integer domain",
    clean_means=(
        "No mutant survives. Every helper is total over a bounded integer "
        "domain and the suite asserts an explicit expected value for every "
        "point in that domain, so any mutated constant or operator changes an "
        "asserted result."
    ),
    command="mutmut run && mutmut results",
    expected="no surviving mutants",
    notes=(
        "`setup.cfg` carries `[mutmut] source_paths` because **mutmut 3.x "
        "reads its configuration from setup.cfg and ignores pyproject.toml** — "
        "without it mutmut exits with `Could not figure out where the code to "
        "mutate is`, which reads like a corpus defect and is not one. The "
        "expected values are written out as a literal table rather than "
        "computed by a reference implementation, so a mutant cannot corrupt "
        "the oracle and the test at the same time."
    ),
    sources={
        "__init__.py": '''"""Rounding helpers over small non-negative integers."""

from roundkit.nearest import STEP, round_to_step
from roundkit.buckets import bucket_index

__all__ = ["STEP", "bucket_index", "round_to_step"]
''',
        "nearest.py": '''"""Rounding to the nearest multiple of a fixed step."""

STEP = 5
HALF_STEP = 3


def round_to_step(value: int) -> int:
    """Round a non-negative integer to the nearest multiple of STEP."""
    remainder = value % STEP
    if remainder < HALF_STEP:
        return value - remainder
    return value + (STEP - remainder)
''',
        "buckets.py": '''"""Assigning a value to a fixed-width bucket."""

BUCKET_WIDTH = 4


def bucket_index(value: int) -> int:
    """Index of the fixed-width bucket containing a non-negative integer."""
    return value // BUCKET_WIDTH
''',
    },
    tests={
        "test_roundkit.py": '''"""Exhaustive expected values, written as a literal table."""

import pytest

from roundkit import STEP, bucket_index, round_to_step

ROUNDED = [
    0, 0, 0, 5, 5, 5, 5, 5, 10, 10,
    10, 10, 10, 15, 15, 15, 15, 15, 20, 20, 20,
]
BUCKETS = [
    0, 0, 0, 0, 1, 1, 1, 1, 2, 2,
    2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5,
]


def test_step_constant() -> None:
    assert STEP == 5


@pytest.mark.parametrize("value", range(len(ROUNDED)))
def test_round_to_step(value: int) -> None:
    assert round_to_step(value) == ROUNDED[value]


@pytest.mark.parametrize("value", range(len(BUCKETS)))
def test_bucket_index(value: int) -> None:
    assert bucket_index(value) == BUCKETS[value]
''',
    },
    extra={
        "setup.cfg": '''# mutmut 3.x reads its configuration here and ignores pyproject.toml.
[mutmut]
source_paths = src/roundkit
tests_dir = tests
runner = python -m pytest -x -q
''',
    },
)

PIP_AUDIT = Spec(
    tool="pip-audit",
    package="daterange",
    description="inclusive calendar date ranges",
    clean_means=(
        "No known vulnerabilities found. The project declares no "
        "dependencies, so the dependency set audited is empty and there is "
        "nothing for an advisory to match."
    ),
    command="pip-audit --requirement requirements.txt --strict",
    expected="No known vulnerabilities found",
    notes=(
        "Deliberately zero dependencies rather than dependencies that are "
        "clean today. This is the inverse of the corpora's planted-CVE pins "
        "(`requests==2.31.0`, `Jinja2==3.1.3`, `urllib3==2.0.6`, "
        "`cryptography==42.0.0`, `paramiko==2.4.1`): those exist to be found, "
        "and this folder exists to be found clean. `--strict` makes an audit "
        "that could not resolve something fail rather than pass quietly."
    ),
    sources={
        "__init__.py": '''"""Inclusive calendar date ranges."""

from daterange.span import DateSpan
from daterange.calendar import business_days

__all__ = ["DateSpan", "business_days"]
''',
        "span.py": '''"""An inclusive range between two dates."""

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Iterator


@dataclass(frozen=True)
class DateSpan:
    """An inclusive span from `start` to `end`."""

    start: date
    end: date

    def __post_init__(self) -> None:
        """Reject a span whose end precedes its start."""
        if self.end < self.start:
            raise ValueError("end precedes start")

    def days(self) -> int:
        """Number of days in the span, counting both endpoints."""
        return (self.end - self.start).days + 1

    def dates(self) -> Iterator[date]:
        """Every date in the span, ascending."""
        for offset in range(self.days()):
            yield self.start + timedelta(days=offset)
''',
        "calendar.py": '''"""Counting business days within a span."""

from daterange.span import DateSpan

SATURDAY = 5


def business_days(span: DateSpan) -> int:
    """Days in the span that fall Monday to Friday."""
    return sum(1 for day in span.dates() if day.weekday() < SATURDAY)
''',
    },
    tests={
        "test_daterange.py": '''"""Cover the validation branch, the span maths and the weekday filter."""

from datetime import date

import pytest

from daterange import DateSpan, business_days


def test_rejects_reversed_span() -> None:
    with pytest.raises(ValueError):
        DateSpan(date(2026, 3, 2), date(2026, 3, 1))


def test_days_counts_both_endpoints() -> None:
    assert DateSpan(date(2026, 3, 1), date(2026, 3, 3)).days() == 3


def test_dates_are_ascending() -> None:
    span = DateSpan(date(2026, 3, 1), date(2026, 3, 2))
    assert list(span.dates()) == [date(2026, 3, 1), date(2026, 3, 2)]


def test_business_days_excludes_the_weekend() -> None:
    # 2026-03-02 is a Monday; the span runs Monday to Sunday.
    span = DateSpan(date(2026, 3, 2), date(2026, 3, 8))
    assert business_days(span) == 5
''',
    },
    extra={
        "requirements.txt": '''# No dependencies. An empty set cannot carry an advisory.
''',
    },
)

SPECS_C = (COMPLEXIPY, COSMIC_RAY, DIFF_COVER, DULWICH, JSCPD, MUTMUT,
           PIP_AUDIT)
