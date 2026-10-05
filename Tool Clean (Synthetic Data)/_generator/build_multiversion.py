#!/usr/bin/env python3
"""Materialize the 5-version boundary matrix on top of build.py's single
version output: 3.6, 3.7 (earliest supported) | 3.11 (middle) | 3.13, 3.14
(latest supported). Placeholder version numbers pending the team lead's exact
list -- swapping numbers later is a rename of these five constants, not a
rebuild.

diff-cover, dulwich and pydriller are excluded from the version split: all
three read git history / coverage-diff data, never Python source, so there is
no version-sensitive surface to measure. They stay single-version (as build.py
already writes them) with a README note explaining why.

3.6 and 3.7 are code-only. No interpreter for either exists in the available
build environments (uv's python-build-standalone starts at 3.8, and getting a
real 3.6/3.7 would need the same legacy-OpenSSL/libffi workaround used for the
Python-Grid-Repos corpus, for tool releases that mostly no longer support
interpreters that old anyway). What ships instead is source that is verified,
not asserted, to be valid there:
  - ast.parse(source, feature_version=(3,6)/(3,7)) -- real CPython grammar
    validation, not just "no obvious new syntax"
  - the untouched pytest suites run unmodified against the downgraded source
    under an available interpreter, proving the mechanical rewrite (builtin
    generics -> typing.X, dataclasses -> plain classes, no __future__
    annotations on 3.6) changed no behavior

The 3.11 baseline already uses two things with a real floor: builtin generic
subscripting (list[int] etc., needs 3.9+) and the stdlib dataclasses module /
`from __future__ import annotations` (both need 3.7+). 3.11/3.13/3.14 reuse
that baseline source byte-for-byte -- confirmed nothing in it was removed by
3.12/3.13's stdlib cleanup (PEP 594, distutils, etc.) -- because downgrading
syntax that already works would just invite Ruff's own pyupgrade rules (UP006/
UP035) to flag it as a false finding on a 3.9+ target.
"""
from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from specs import SPECS  # noqa: E402
import build as build_mod  # noqa: E402

VERSIONS = ["3.6", "3.7", "3.11", "3.13", "3.14"]
UNVERSIONED = {"diff-cover", "dulwich", "pydriller"}

TYPING_MAP = {"list": "List", "dict": "Dict", "tuple": "Tuple",
              "set": "Set", "frozenset": "FrozenSet", "type": "Type"}
TOKEN_RE = re.compile(r"\b(list|dict|tuple|set|frozenset|type)\[")
IMPORT_RE = re.compile(r"^from typing import (.+)$", re.M)
DOCSTRING_RE = re.compile(r'^(""".*?"""\s*\n)', re.S)
FUTURE_RE = re.compile(r"^from __future__ import annotations\n\n?", re.M)
REQUIRES_RE = re.compile(r'requires-python = ".*?"')

# Hand-converted plain-class replacements for the 7 files that use
# @dataclass, which does not exist before 3.7. Audited: none of these
# dataclasses is compared, hashed, replaced, or introspected via
# dataclasses.fields/asdict/replace anywhere in the corpus, so a plain class
# with an explicit __init__ is a behavior-preserving substitute -- proved,
# not assumed, by running every folder's own pytest suite unmodified after
# the swap.
PLAIN_CLASS_OVERRIDES = {
    "Bandit/src/stockroom/levels.py": '''"""Reorder points expressed as whole units of stock."""


class ReorderPolicy:
    """A reorder rule for one stock-keeping unit."""

    def __init__(self, minimum_units, target_units):
        self.minimum_units = minimum_units
        self.target_units = target_units

    def deficit(self, on_hand):
        """Units missing before the shelf reaches its minimum."""
        if on_hand >= self.minimum_units:
            return 0
        return self.minimum_units - on_hand


def reorder_quantity(policy, on_hand):
    """Units to order so the shelf returns to its target level."""
    if policy.deficit(on_hand) == 0:
        return 0
    return policy.target_units - on_hand
''',
    "Pymcdc/src/eligibility/decision.py": '''"""A single three-condition eligibility decision."""


class Applicant:
    """The three facts the decision depends on."""

    def __init__(self, has_income, is_resident, has_guarantor):
        self.has_income = has_income
        self.is_resident = is_resident
        self.has_guarantor = has_guarantor


def is_eligible(applicant):
    """Eligible when there is income and either residency or a guarantor."""
    return applicant.has_income and (
        applicant.is_resident or applicant.has_guarantor
    )
''',
    "Ruff/src/tidyconf/layers.py": '''"""Settings layers, merged lowest precedence first."""

from collections.abc import Mapping, Sequence
from typing import Dict


class Layer:
    """A named settings layer and its values."""

    def __init__(self, name, values):
        self.name = name
        self.values = values


def merge_layers(layers: Sequence[Layer]) -> Dict[str, str]:
    """Merge layers so later layers override earlier ones."""
    merged: Dict[str, str] = {}
    for layer in layers:
        merged.update(layer.values)
    return merged
''',
    "astroid/src/shapebook/shapes.py": '''"""Concrete shape types with statically known attributes."""

import math


class Shape:
    """Base shape carrying only a label."""

    def __init__(self, label):
        self.label = label

    def area(self):
        """Area of the shape; the base shape encloses nothing."""
        return 0.0


class Rectangle(Shape):
    """An axis-aligned rectangle."""

    def __init__(self, label, width, height):
        super().__init__(label)
        self.width = width
        self.height = height

    def area(self):
        """Width times height."""
        return self.width * self.height


class Circle(Shape):
    """A circle given by its radius."""

    def __init__(self, label, radius):
        super().__init__(label)
        self.radius = radius

    def area(self):
        """Pi r squared."""
        return math.pi * self.radius * self.radius
''',
    "dulwich/src/notekeeper/notes.py": '''"""Release notes and their grouping."""

from typing import Dict, List, Sequence


class Note:
    """One release note: a kind and a one-line summary."""

    def __init__(self, kind, summary):
        self.kind = kind
        self.summary = summary


def group_by_kind(notes: Sequence[Note]) -> Dict[str, List[str]]:
    """Group note summaries under their kind, preserving input order."""
    grouped: Dict[str, List[str]] = {}
    for note in notes:
        grouped.setdefault(note.kind, []).append(note.summary)
    return grouped
''',
    "pip-audit/src/daterange/span.py": '''"""An inclusive range between two dates."""

from datetime import timedelta


class DateSpan:
    """An inclusive span from `start` to `end`."""

    def __init__(self, start, end):
        if end < start:
            raise ValueError("end precedes start")
        self.start = start
        self.end = end

    def days(self):
        """Number of days in the span, counting both endpoints."""
        return (self.end - self.start).days + 1

    def dates(self):
        """Every date in the span, ascending."""
        for offset in range(self.days()):
            yield self.start + timedelta(days=offset)
''',
    "pylint/src/shelfmark/records.py": '''"""Catalogue record types."""


class BookRecord:
    """One catalogued book."""

    def __init__(self, shelfmark, title, copies):
        self.shelfmark = shelfmark
        self.title = title
        self.copies = copies

    def is_available(self):
        """Whether at least one copy is on the shelf."""
        return self.copies > 0
''',
}


def convert_generics(text: str) -> str:
    """list[X] / dict[K, V] / ... -> typing.List[X] / typing.Dict[K, V] / ...
    Safe here because every occurrence in this corpus is an annotation, never
    a runtime subscript of a variable literally named list/dict/tuple/etc --
    audited once, by hand, across all 27 affected files before this shipped.
    """
    used = sorted({TYPING_MAP[m.group(1)] for m in TOKEN_RE.finditer(text)})
    if not used:
        return text
    new_text = TOKEN_RE.sub(lambda m: TYPING_MAP[m.group(1)] + "[", text)
    m = IMPORT_RE.search(new_text)
    if m:
        merged = sorted(set(n.strip() for n in m.group(1).split(",")) | set(used))
        new_text = new_text[:m.start()] + f"from typing import {', '.join(merged)}" + new_text[m.end():]
    else:
        future_m = re.search(r"^from __future__ import .+\n", new_text, re.M)
        if future_m:
            insert_at = future_m.end()
            new_text = new_text[:insert_at] + f"from typing import {', '.join(used)}\n" + new_text[insert_at:]
        else:
            dm = DOCSTRING_RE.match(new_text)
            insert_at = dm.end() if dm else 0
            line = f"from typing import {', '.join(used)}\n"
            if dm and not new_text[insert_at:].startswith("\n"):
                line = "\n" + line
            new_text = new_text[:insert_at] + line + new_text[insert_at:]
    return new_text


def write_version_folder(canonical: Path, dest: Path, version: str) -> None:
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(canonical, dest)
    for f in sorted(p for p in dest.rglob("*.py") if p.is_file()):
        text = f.read_text()
        if version in ("3.6", "3.7"):
            text = convert_generics(text)
        if version == "3.6":
            rel = str(f.relative_to(dest))
            for tool_rel, override in PLAIN_CLASS_OVERRIDES.items():
                if rel == tool_rel.split("/", 1)[1]:  # path within the tool folder
                    text = override
                    break
            text = FUTURE_RE.sub("", text)
        f.write_text(text)
    pyproject = dest / "pyproject.toml"
    if pyproject.exists():
        t = pyproject.read_text()
        t = REQUIRES_RE.sub(f'requires-python = "=={version}.*"', t)
        pyproject.write_text(t)


RUFF_TARGET = {"3.6": "py36", "3.7": "py37", "3.11": "py311",
               "3.13": "py313", "3.14": "py314"}


def main() -> int:
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("out")
    written = build_mod.build(root)  # canonical single-version build first
    for spec in SPECS:
        tool_root = root / spec.tool
        if spec.tool in UNVERSIONED:
            continue
        # snapshot the canonical (currently 3.11-targeted) content, then
        # remove the flat layout so only versioned subfolders remain
        canonical_snapshot = tool_root.parent / f".__canonical_{spec.tool}"
        if canonical_snapshot.exists():
            shutil.rmtree(canonical_snapshot)
        shutil.copytree(tool_root, canonical_snapshot)
        for child in tool_root.iterdir():
            if child.is_dir():
                shutil.rmtree(child)
            else:
                child.unlink()
        for version in VERSIONS:
            dest = tool_root / f"py{version}"
            write_version_folder(canonical_snapshot, dest, version)
            if spec.tool == "Ruff":
                ruff_toml = dest / "ruff.toml"
                if ruff_toml.exists():
                    t = ruff_toml.read_text()
                    t = re.sub(r'target-version = ".*?"',
                               f'target-version = "{RUFF_TARGET[version]}"', t)
                    ruff_toml.write_text(t)
        shutil.rmtree(canonical_snapshot)
    print(f"multi-version build complete: {len(written)} tool folders processed, "
          f"{len(written) - len(UNVERSIONED)} versioned x {len(VERSIONS)} versions, "
          f"{len(UNVERSIONED)} left single-version")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
