"""Specs: pyan3, pydriller, pylint, symilar, settrace driver, testmon, vulture."""

from __future__ import annotations

from specs import Spec

PYAN3 = Spec(
    tool="pyan3",
    package="pipeflow",
    description="a three-stage processing pipeline",
    clean_means=(
        "pyan3 builds the call graph without error and resolves every call to "
        "a defined node: the emitted graph has no unresolved reference and the "
        "stage-to-stage edges appear as written."
    ),
    command=("pyan3 src/pipeflow/*.py --uses --defines --colored --grouped "
             "--dot --file graph.dot"),
    expected="a DOT graph with defines and uses edges; exit 0",
    notes=(
        "Call-graph tools resolve static call sites, so a pipeline assembled "
        "through a registry of callables or `getattr` dispatch produces a "
        "graph full of holes while the code runs perfectly. Stages here call "
        "one another by name. Verified flags: `--uses`, `--defines`, "
        "`--colored`, `--grouped`, `--dot`, `--file`."
    ),
    sources={
        "__init__.py": '''"""A three-stage text processing pipeline."""

from pipeflow.stages import clean_stage, count_stage, report_stage
from pipeflow.pipeline import run_pipeline

__all__ = ["clean_stage", "count_stage", "report_stage", "run_pipeline"]
''',
        "stages.py": '''"""The three pipeline stages, each a plain named function."""


def clean_stage(text: str) -> list[str]:
    """Split text into lowercase words, dropping empty fragments."""
    return [word.lower() for word in text.split() if word]


def count_stage(words: list[str]) -> dict[str, int]:
    """Count occurrences of each word."""
    counts: dict[str, int] = {}
    for word in words:
        counts[word] = counts.get(word, 0) + 1
    return counts


def report_stage(counts: dict[str, int]) -> list[str]:
    """Render counts as `word=count` lines, most frequent first."""
    ordered = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    return [f"{word}={count}" for word, count in ordered]
''',
        "pipeline.py": '''"""Assembly of the stages by direct call, not by dispatch table."""

from pipeflow.stages import clean_stage, count_stage, report_stage


def run_pipeline(text: str) -> list[str]:
    """Run clean, then count, then report."""
    words = clean_stage(text)
    counts = count_stage(words)
    return report_stage(counts)
''',
    },
    tests={
        "test_pipeflow.py": '''"""Cover each stage and the assembled pipeline."""

from pipeflow import clean_stage, count_stage, report_stage, run_pipeline


def test_clean_stage_lowercases_and_splits() -> None:
    assert clean_stage("A  b") == ["a", "b"]


def test_count_stage_counts_repeats() -> None:
    assert count_stage(["a", "b", "a"]) == {"a": 2, "b": 1}


def test_report_stage_orders_by_count_then_word() -> None:
    assert report_stage({"b": 1, "a": 1, "c": 2}) == ["c=2", "a=1", "b=1"]


def test_run_pipeline_end_to_end() -> None:
    assert run_pipeline("a b a") == ["a=2", "b=1"]
''',
    },
)

PYDRILLER = Spec(
    tool="pydriller",
    package="taskledger",
    description="a ledger of task state transitions",
    clean_means=(
        "PyDriller traverses every commit and reports the same commit count "
        "and the same set of authors as `git log`, with per-file modification "
        "counts attributable to individual commits."
    ),
    command="python -m driver",
    expected="N commits, 3 contributors",
    notes=(
        "PyDriller and dulwich are each other's cross-check in the roster, so "
        "this folder and the dulwich folder hold different code and different "
        "histories — two tools agreeing about one repository proves less than "
        "two tools agreeing about two. The history gives each commit exactly "
        "one file so churn attribution is unambiguous. If PyDriller fails to "
        "open the repository on a Windows host reached through a Linux bridge, "
        "the cause is the worktree `.git` file carrying a Windows `gitdir:` "
        "path, not the corpus."
    ),
    needs_git=True,
    sources={
        "__init__.py": '''"""A ledger of task state transitions."""

from taskledger.states import STATES, next_state
from taskledger.ledger import Ledger

__all__ = ["Ledger", "STATES", "next_state"]
''',
        "states.py": '''"""The permitted task states and the transitions between them."""

STATES = ("open", "active", "blocked", "done")

TRANSITIONS = {
    "open": ("active",),
    "active": ("blocked", "done"),
    "blocked": ("active",),
    "done": (),
}


def next_state(current: str, requested: str) -> str:
    """Move to `requested` if the transition is permitted, else raise."""
    if requested not in TRANSITIONS.get(current, ()):
        raise ValueError(f"{current} cannot become {requested}")
    return requested
''',
        "ledger.py": '''"""A ledger recording each accepted transition in order."""

from taskledger.states import next_state


class Ledger:
    """An append-only record of one task's state transitions."""

    def __init__(self) -> None:
        """Begin in the open state with no transitions recorded."""
        self._history: list[str] = ["open"]

    @property
    def state(self) -> str:
        """The current state."""
        return self._history[-1]

    @property
    def history(self) -> list[str]:
        """Every state the task has held, in order."""
        return list(self._history)

    def advance(self, requested: str) -> str:
        """Record a transition to `requested` and return the new state."""
        self._history.append(next_state(self.state, requested))
        return self.state
''',
    },
    tests={
        "test_taskledger.py": '''"""Cover permitted and rejected transitions, and the ledger record."""

import pytest

from taskledger import Ledger, STATES, next_state


def test_state_names() -> None:
    assert STATES == ("open", "active", "blocked", "done")


def test_permitted_transition() -> None:
    assert next_state("open", "active") == "active"


def test_rejected_transition() -> None:
    with pytest.raises(ValueError):
        next_state("done", "active")


def test_ledger_records_history() -> None:
    ledger = Ledger()
    assert ledger.state == "open"
    ledger.advance("active")
    ledger.advance("done")
    assert ledger.history == ["open", "active", "done"]
''',
    },
    extra={
        "driver.py": '''"""Mine this repository's history with PyDriller and report the totals.

Counts commits, distinct authors, and modifications per commit — the three
facts a churn metric is built from.
"""

from __future__ import annotations

from pydriller import Repository


def main() -> int:
    """Traverse every commit and print commit and contributor counts."""
    commits = 0
    authors = set()
    modifications = 0
    for commit in Repository(".").traverse_commits():
        commits += 1
        authors.add(commit.author.email)
        modifications += len(commit.modified_files)
    print(f"{commits} commits, {len(authors)} contributors")
    print(f"{modifications} file modifications")
    return 0 if commits and authors else 1


if __name__ == "__main__":
    raise SystemExit(main())
''',
    },
)

PYLINT = Spec(
    tool="pylint",
    package="shelfmark",
    description="a lending-library catalogue",
    clean_means=(
        "`pylint` scores **10.00/10** with no message of any category: every "
        "module, class and function is documented, every name follows the "
        "conventions, nothing is unused, imports are ordered, and no line "
        "exceeds the limit."
    ),
    command="pylint src/shelfmark --fail-under=10",
    expected="Your code has been rated at 10.00/10",
    notes=(
        "`--fail-under=10` is what turns 10.00/10 into an exit code; without "
        "it pylint exits 0 on a 9.5 and the folder would silently stop being "
        "clean. No `# pylint: disable` comment appears anywhere — a suppressed "
        "message is not a clean result."
    ),
    sources={
        "__init__.py": '''"""A small lending-library catalogue."""

from shelfmark.catalogue import Catalogue
from shelfmark.records import BookRecord

__all__ = ["BookRecord", "Catalogue"]
''',
        "records.py": '''"""Catalogue record types."""

from dataclasses import dataclass


@dataclass(frozen=True)
class BookRecord:
    """One catalogued book."""

    shelfmark: str
    title: str
    copies: int

    def is_available(self) -> bool:
        """Whether at least one copy is on the shelf."""
        return self.copies > 0
''',
        "catalogue.py": '''"""The catalogue itself: records held against their shelfmarks."""

from typing import Iterator

from shelfmark.records import BookRecord


class Catalogue:
    """A collection of book records keyed by shelfmark."""

    def __init__(self) -> None:
        """Start with an empty catalogue."""
        self._records: dict[str, BookRecord] = {}

    def add(self, record: BookRecord) -> None:
        """Add or replace a record."""
        self._records[record.shelfmark] = record

    def find(self, shelfmark: str) -> BookRecord:
        """Look a record up by shelfmark."""
        return self._records[shelfmark]

    def available(self) -> Iterator[BookRecord]:
        """Every record with at least one copy available."""
        for shelfmark in sorted(self._records):
            record = self._records[shelfmark]
            if record.is_available():
                yield record

    def total_copies(self) -> int:
        """Total number of copies across the catalogue."""
        return sum(record.copies for record in self._records.values())
''',
    },
    tests={
        "test_shelfmark.py": '''"""Cover availability, lookup, filtering and the total."""

from shelfmark import BookRecord, Catalogue


def test_is_available_both_ways() -> None:
    assert BookRecord("A1", "Tides", 1).is_available() is True
    assert BookRecord("A2", "Kilns", 0).is_available() is False


def test_add_and_find() -> None:
    catalogue = Catalogue()
    record = BookRecord("B1", "Ferns", 2)
    catalogue.add(record)
    assert catalogue.find("B1") is record


def test_available_skips_empty_shelves() -> None:
    catalogue = Catalogue()
    catalogue.add(BookRecord("C1", "Loams", 0))
    catalogue.add(BookRecord("C2", "Reeds", 3))
    assert [r.shelfmark for r in catalogue.available()] == ["C2"]


def test_total_copies() -> None:
    catalogue = Catalogue()
    catalogue.add(BookRecord("D1", "Marls", 2))
    catalogue.add(BookRecord("D2", "Silts", 5))
    assert catalogue.total_copies() == 7
''',
    },
)

SYMILAR = Spec(
    tool="symilar",
    package="checkfour",
    description="four field validators, each structurally distinct",
    clean_means=(
        "symilar reports no similar lines. At a threshold of 4 lines — "
        "tighter than the default — no two modules share a comparable block, "
        "because each validator uses a different construct: a regex, a "
        "checksum loop, a set membership test and a range comparison."
    ),
    command=("symilar --duplicates=4 --ignore-comments --ignore-docstrings "
             "src/checkfour/*.py"),
    expected="TOTAL lines=... duplicates=0 percent=0.00",
    notes=(
        "Four validators are the classic place a clone group forms: the same "
        "guard-clause-then-return shape, copied. The temptation is worth "
        "resisting on purpose here. Because symilar is what pylint ships as "
        "its duplicate detector, this folder and the jscpd folder are separate "
        "— the same two tools pointed at one directory is a single "
        "measurement, not a cross-check."
    ),
    sources={
        "__init__.py": '''"""Four independent field validators."""

from checkfour.postcode import is_valid_postcode
from checkfour.checksum import has_valid_checksum
from checkfour.membership import is_known_region
from checkfour.bounds import is_within_reading_range

__all__ = [
    "has_valid_checksum",
    "is_known_region",
    "is_valid_postcode",
    "is_within_reading_range",
]
''',
        "postcode.py": '''"""Postcode validation by regular expression."""

import re

POSTCODE_PATTERN = re.compile(r"^[A-Z]{2}\\d{2}-\\d{3}$")


def is_valid_postcode(candidate: str) -> bool:
    """Whether a candidate matches the two-letter, four-digit postcode form."""
    return POSTCODE_PATTERN.match(candidate) is not None
''',
        "checksum.py": '''"""Account-number validation by weighted digit sum."""

MODULUS = 11


def has_valid_checksum(digits: str) -> bool:
    """Whether a digit string satisfies the weighted modulus-11 check."""
    if not digits.isdigit():
        return False
    weighted = 0
    weight = len(digits)
    for character in digits:
        weighted += int(character) * weight
        weight -= 1
    return weighted % MODULUS == 0
''',
        "membership.py": '''"""Region validation by set membership."""

KNOWN_REGIONS = frozenset({
    "north", "south", "east", "west", "central",
})


def is_known_region(name: str) -> bool:
    """Whether a region name is one of the five recognised regions."""
    return name.casefold() in KNOWN_REGIONS
''',
        "bounds.py": '''"""Sensor-reading validation by range comparison."""

MINIMUM_READING = -40.0
MAXIMUM_READING = 85.0


def is_within_reading_range(reading: float) -> bool:
    """Whether a sensor reading lies inside the instrument's rated range."""
    return MINIMUM_READING <= reading <= MAXIMUM_READING
''',
    },
    tests={
        "test_checkfour.py": '''"""Both outcomes of all four validators."""

from checkfour import (
    has_valid_checksum,
    is_known_region,
    is_valid_postcode,
    is_within_reading_range,
)


def test_postcode() -> None:
    assert is_valid_postcode("AB12-345") is True
    assert is_valid_postcode("ab12-345") is False


def test_checksum() -> None:
    assert has_valid_checksum("0000") is True
    assert has_valid_checksum("0001") is False
    assert has_valid_checksum("12x4") is False


def test_region() -> None:
    assert is_known_region("North") is True
    assert is_known_region("orbital") is False


def test_reading_range() -> None:
    assert is_within_reading_range(20.0) is True
    assert is_within_reading_range(120.0) is False
''',
    },
)

SETTRACE = Spec(
    tool="sys.settrace driver (stdlib)",
    package="tracedemo",
    description="a queue scheduler traced by a stdlib coverage driver",
    clean_means=(
        "The driver traces every executable statement in the package: the "
        "statements-hit count equals the statements-found count, so coverage "
        "is 100% with nothing missing."
    ),
    command="python -m driver",
    expected="tracedemo: 100% (N/N statements)",
    notes=(
        "This folder was empty in the harvested set because there is nothing "
        "to harvest: the tool is `sys.settrace` itself, and the driver is "
        "written by whoever needs it. `driver.py` here is that driver — a "
        "line-event tracer that records executed line numbers and compares "
        "them against the statement lines found by `ast`. It is the only "
        "coverage-shaped number available on an interpreter too old for "
        "Coverage.py, which is why the roster carries it."
    ),
    sources={
        "__init__.py": '''"""A first-in, first-out queue scheduler."""

from tracedemo.queue import TaskQueue
from tracedemo.policy import should_defer

__all__ = ["TaskQueue", "should_defer"]
''',
        "policy.py": '''"""The deferral policy applied before a task is admitted."""

MAX_ATTEMPTS = 3


def should_defer(attempts: int, queue_depth: int, capacity: int) -> bool:
    """Whether a task should wait rather than be admitted now."""
    if attempts >= MAX_ATTEMPTS:
        return False
    return queue_depth >= capacity
''',
        "queue.py": '''"""A bounded first-in, first-out task queue."""

from tracedemo.policy import should_defer


class TaskQueue:
    """A queue that admits tasks up to a fixed capacity."""

    def __init__(self, capacity: int) -> None:
        """Create an empty queue with the given capacity."""
        self.capacity = capacity
        self._waiting: list[str] = []

    @property
    def depth(self) -> int:
        """Number of tasks currently queued."""
        return len(self._waiting)

    def offer(self, name: str, attempts: int) -> bool:
        """Admit a task unless the policy says to defer it."""
        if should_defer(attempts, self.depth, self.capacity):
            return False
        self._waiting.append(name)
        return True

    def take(self) -> str:
        """Remove and return the oldest queued task."""
        return self._waiting.pop(0)
''',
    },
    tests={
        "test_tracedemo.py": '''"""Cover both policy branches and every queue method."""

from tracedemo import TaskQueue, should_defer


def test_should_defer_when_full_and_attempts_remain() -> None:
    assert should_defer(1, 2, 2) is True


def test_should_not_defer_with_room() -> None:
    assert should_defer(1, 0, 2) is False


def test_should_not_defer_after_max_attempts() -> None:
    assert should_defer(3, 5, 2) is False


def test_queue_admits_and_takes() -> None:
    queue = TaskQueue(2)
    assert queue.offer("a", 0) is True
    assert queue.depth == 1
    assert queue.take() == "a"


def test_queue_defers_when_full() -> None:
    queue = TaskQueue(1)
    queue.offer("a", 0)
    assert queue.offer("b", 0) is False
''',
    },
    extra={
        "driver.py": '''"""A standard-library statement-coverage driver.

Registers a ``sys.settrace`` line-event hook, exercises the package, then
compares the executed line numbers against the lines the interpreter can
actually report.

The comparison set comes from each code object's ``co_lines()``, not from
walking ``ast``. A first version used ``ast`` and reported 80% on a fully
exercised package, because the set of *statement* line numbers and the set of
*traceable* line numbers are not the same set -- a multi-line call, a decorator
and a class body all report differently. Measuring against a set the tracer can
never produce makes 100% unreachable and looks exactly like missing coverage.
"""

from __future__ import annotations

import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent / "src"
sys.path.insert(0, str(SRC))

executed: dict[str, set[int]] = {}


def _trace(frame, event, _arg):
    """Record every line event occurring inside the package."""
    if event == "line":
        name = Path(frame.f_code.co_filename).name
        executed.setdefault(name, set()).add(frame.f_lineno)
    return _trace


def traceable_lines(path: Path) -> set[int]:
    """Line numbers the interpreter can emit line events for."""
    code = compile(path.read_text(encoding="ascii"), str(path), "exec")
    lines: set[int] = set()
    pending = [code]
    while pending:
        current = pending.pop()
        for _start, _end, line in current.co_lines():
            # co_lines() emits line 0 for a module's implicit RESUME, which no
            # line event ever reports. Counting it caps coverage below 100%.
            if line:
                lines.add(line)
        for constant in current.co_consts:
            if hasattr(constant, "co_lines"):
                pending.append(constant)
    return lines


def exercise() -> None:
    """Drive every statement in the package."""
    from tracedemo import TaskQueue, should_defer

    should_defer(1, 2, 2)
    should_defer(1, 0, 2)
    should_defer(3, 5, 2)
    queue = TaskQueue(1)
    queue.offer("a", 0)
    queue.offer("b", 0)
    queue.take()
    _ = queue.depth


def main() -> int:
    """Trace the package and report statement coverage."""
    modules = sorted((SRC / "tracedemo").rglob("*.py"))
    expected = {path: traceable_lines(path) for path in modules}

    # Import inside the traced region so module-level lines are recorded too.
    sys.settrace(_trace)
    try:
        exercise()
    finally:
        sys.settrace(None)

    found = 0
    hit = 0
    for path in modules:
        seen = executed.get(path.name, set())
        wanted = expected[path]
        found += len(wanted)
        hit += len(wanted & seen)
        missing = sorted(wanted - seen)
        if missing:
            print(f"{path.name}: missing lines {missing}")
    percent = 100 * hit // found if found else 0
    print(f"tracedemo: {percent}% ({hit}/{found} statements)")
    return 0 if percent == 100 else 1


if __name__ == "__main__":
    raise SystemExit(main())
''',
    },
)

TESTMON = Spec(
    tool="testmon",
    package="coinshift",
    description="currency rounding and split",
    clean_means=(
        "`pytest --testmon` collects, builds its dependency database and runs "
        "every test green; a second run with nothing changed selects no tests "
        "and still exits 0."
    ),
    command="pytest --testmon -q && pytest --testmon -q",
    expected="all tests pass, then 'no tests ran' on the unchanged re-run",
    notes=(
        "The second run is the actual assertion. A first green run only proves "
        "the suite passes; testmon's job is to notice that nothing changed, "
        "and an empty selection exiting 0 is the clean result. `.testmondata` "
        "is generated state, not corpus content, and is git-ignored."
    ),
    sources={
        "__init__.py": '''"""Currency rounding and even splitting, in whole cents."""

from coinshift.rounding import round_half_up_cents
from coinshift.split import split_evenly

__all__ = ["round_half_up_cents", "split_evenly"]
''',
        "rounding.py": '''"""Half-up rounding of a fractional cent amount."""


def round_half_up_cents(amount: float) -> int:
    """Round a cent amount half-up to a whole number of cents."""
    whole = int(amount)
    remainder = amount - whole
    if remainder >= 0.5:
        return whole + 1
    return whole
''',
        "split.py": '''"""Splitting an amount into equal shares without losing a cent."""


def split_evenly(total_cents: int, ways: int) -> list[int]:
    """Split cents into `ways` shares, distributing the remainder."""
    if ways <= 0:
        raise ValueError("ways must be positive")
    base, remainder = divmod(total_cents, ways)
    return [base + (1 if index < remainder else 0) for index in range(ways)]
''',
    },
    tests={
        "test_rounding.py": '''"""Both rounding branches, including the exact half."""

from coinshift import round_half_up_cents


def test_rounds_down_below_half() -> None:
    assert round_half_up_cents(10.4) == 10


def test_rounds_up_at_half() -> None:
    assert round_half_up_cents(10.5) == 11
''',
        "test_split.py": '''"""Even and uneven splits, and the rejected argument."""

import pytest

from coinshift import split_evenly


def test_even_split() -> None:
    assert split_evenly(100, 4) == [25, 25, 25, 25]


def test_uneven_split_distributes_remainder() -> None:
    assert split_evenly(10, 3) == [4, 3, 3]
    assert sum(split_evenly(10, 3)) == 10


def test_rejects_zero_ways() -> None:
    with pytest.raises(ValueError):
        split_evenly(10, 0)
''',
    },
    extra={
        ".gitignore": '''.testmondata
__pycache__/
*.pyc
''',
    },
)

VULTURE = Spec(
    tool="vulture",
    package="liveedge",
    description="an undirected graph with every member reachable",
    clean_means=(
        "vulture reports no dead code at 100% confidence and none at 60%: "
        "every module, class, method, attribute and constant is referenced "
        "from another module or from the suite, and there are no unused "
        "imports or unreachable branches."
    ),
    command=('vulture src/ tests/ --min-confidence 60 '
             '--ignore-names "test_*"'),
    expected="(no output; exit 0)",
    notes=(
        "`tests/` is passed alongside `src/` so vulture can see the usages, "
        "and `--ignore-names test_*` excludes the test functions themselves — "
        "pytest calls them by collection, so vulture is right that nothing "
        "calls them and wrong that they are dead. Scanning `src/` alone would "
        "report every public function as unused, which is the mirror-image "
        "mistake."
    ),
    sources={
        "__init__.py": '''"""An undirected graph over hashable labels."""

from liveedge.graph import Graph
from liveedge.walk import connected_labels

__all__ = ["Graph", "connected_labels"]
''',
        "graph.py": '''"""An undirected graph stored as an adjacency mapping."""


class Graph:
    """An undirected graph over string labels."""

    def __init__(self) -> None:
        """Create a graph with no vertices."""
        self.adjacency: dict[str, set[str]] = {}

    def add_edge(self, left: str, right: str) -> None:
        """Add an undirected edge, creating either endpoint as needed."""
        self.adjacency.setdefault(left, set()).add(right)
        self.adjacency.setdefault(right, set()).add(left)

    def neighbours(self, label: str) -> set[str]:
        """Labels adjacent to a vertex; an unknown vertex has none."""
        return self.adjacency.get(label, set())

    def order(self) -> int:
        """Number of vertices in the graph."""
        return len(self.adjacency)
''',
        "walk.py": '''"""Reachability over a graph."""

from liveedge.graph import Graph


def connected_labels(graph: Graph, start: str) -> list[str]:
    """Labels reachable from `start`, including it, in sorted order."""
    seen = {start}
    pending = [start]
    while pending:
        label = pending.pop()
        for neighbour in graph.neighbours(label):
            if neighbour not in seen:
                seen.add(neighbour)
                pending.append(neighbour)
    return sorted(seen)
''',
    },
    tests={
        "test_liveedge.py": '''"""Reference every graph member so nothing reads as dead."""

from liveedge import Graph, connected_labels


def test_add_edge_is_symmetric() -> None:
    graph = Graph()
    graph.add_edge("a", "b")
    assert graph.neighbours("a") == {"b"}
    assert graph.neighbours("b") == {"a"}


def test_neighbours_of_unknown_vertex() -> None:
    assert Graph().neighbours("absent") == set()


def test_order_counts_vertices() -> None:
    graph = Graph()
    graph.add_edge("a", "b")
    assert graph.order() == 2


def test_adjacency_is_exposed() -> None:
    graph = Graph()
    graph.add_edge("a", "b")
    assert set(graph.adjacency) == {"a", "b"}


def test_connected_labels_spans_the_component() -> None:
    graph = Graph()
    graph.add_edge("a", "b")
    graph.add_edge("b", "c")
    graph.add_edge("x", "y")
    assert connected_labels(graph, "a") == ["a", "b", "c"]


def test_connected_labels_isolated_vertex() -> None:
    assert connected_labels(Graph(), "lone") == ["lone"]
''',
    },
)

SPECS_D = (PYAN3, PYDRILLER, PYLINT, SYMILAR, SETTRACE, TESTMON, VULTURE)
