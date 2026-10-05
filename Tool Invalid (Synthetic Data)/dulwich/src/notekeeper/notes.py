"""Release notes and their grouping."""

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
