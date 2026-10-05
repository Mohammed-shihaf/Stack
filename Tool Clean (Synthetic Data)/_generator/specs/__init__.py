"""Tool folder specifications.

One :class:`Spec` per tool folder. Content is written out verbatim by
``build.py``; nothing is templated, because a shared template would create the
very clone pairs jscpd and symilar are meant to find nothing of.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Spec:
    """Everything needed to write one tool folder."""

    tool: str
    package: str
    description: str
    clean_means: str
    command: str
    expected: str
    notes: str
    sources: dict[str, str] = field(default_factory=dict)
    tests: dict[str, str] = field(default_factory=dict)
    extra: dict[str, str] = field(default_factory=dict)
    needs_git: bool = False
    needs_diff_branch: bool = False
    #: repo-relative path -> text appended on the ``feature`` branch
    diff_files: dict[str, str] = field(default_factory=dict)


from specs.group_a import SPECS_A  # noqa: E402
from specs.group_b import SPECS_B  # noqa: E402
from specs.group_c import SPECS_C  # noqa: E402
from specs.group_d import SPECS_D  # noqa: E402

SPECS: tuple[Spec, ...] = SPECS_A + SPECS_B + SPECS_C + SPECS_D

__all__ = ["Spec", "SPECS"]
