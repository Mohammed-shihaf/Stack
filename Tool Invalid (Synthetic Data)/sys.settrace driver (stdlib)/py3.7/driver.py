"""A standard-library statement-coverage driver.

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
from typing import Dict, Set

import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent / "src"
sys.path.insert(0, str(SRC))

executed: Dict[str, Set[int]] = {}


def _trace(frame, event, _arg):
    """Record every line event occurring inside the package."""
    if event == "line":
        name = Path(frame.f_code.co_filename).name
        executed.setdefault(name, set()).add(frame.f_lineno)
    return _trace


def traceable_lines(path: Path) -> Set[int]:
    """Line numbers the interpreter can emit line events for."""
    code = compile(path.read_text(encoding="ascii"), str(path), "exec")
    lines: Set[int] = set()
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
    """Drive a narrow slice of the package: one route, one transition."""
    from evrouter import next_state, route_event

    calls = []
    route_event("created", {"created": lambda event_type: calls.append(event_type)})
    next_state("draft", "submit")


def main() -> int:
    """Trace the package and report statement coverage."""
    modules = sorted((SRC / "evrouter").rglob("*.py"))
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
    print(f"evrouter: {percent}% ({hit}/{found} statements)")
    return 0 if percent == 100 else 1


if __name__ == "__main__":
    raise SystemExit(main())
