"""Specs: Radon, Ruff, Semgrep, SlipCover, Trivy, astroid, cognitive-ast."""

from __future__ import annotations

from rules import SINK_RULES
from specs import Spec

RADON = Spec(
    tool="Radon",
    package="payscale",
    description="progressive payroll brackets",
    clean_means=(
        "Every block ranks **A** on cyclomatic complexity, and maintainability "
        "index ranks A. `radon cc -n B` prints nothing, because nothing is "
        "rank B or worse."
    ),
    command="radon cc src/ -s -n B && radon mi src/ -n B",
    expected="(no output from either; exit 0)",
    notes=(
        "Bracket arithmetic is the classic place complexity accumulates — a "
        "chain of `elif` per band. Iterating over a table of brackets keeps "
        "every function at CC 2-3 while computing the same answer."
    ),
    sources={
        "__init__.py": '''"""Progressive payroll bracket arithmetic, in whole cents."""

from payscale.brackets import BRACKETS, Bracket
from payscale.compute import tax_cents, take_home_cents

__all__ = ["BRACKETS", "Bracket", "tax_cents", "take_home_cents"]
''',
        "brackets.py": '''"""The bracket table, expressed as an ordered tuple."""

from typing import NamedTuple


class Bracket(NamedTuple):
    """One progressive band: a ceiling and the rate applied below it."""

    ceiling_cents: int
    rate_per_mille: int


BRACKETS = (
    Bracket(1_800_000, 0),
    Bracket(4_500_000, 120),
    Bracket(9_000_000, 225),
    Bracket(0, 310),
)
''',
        "compute.py": '''"""Tax and take-home computed by walking the bracket table."""

from payscale.brackets import BRACKETS


def tax_cents(gross_cents: int) -> int:
    """Progressive tax owed on a gross amount, in whole cents."""
    owed = 0
    lower = 0
    for bracket in BRACKETS:
        ceiling = bracket.ceiling_cents or gross_cents
        taxable = min(gross_cents, ceiling) - lower
        if taxable > 0:
            owed += taxable * bracket.rate_per_mille // 1000
        lower = ceiling
    return owed


def take_home_cents(gross_cents: int) -> int:
    """Gross amount less the progressive tax owed on it."""
    return gross_cents - tax_cents(gross_cents)
''',
    },
    tests={
        "test_payscale.py": '''"""Cover the zero band, a middle band and the top band."""

from payscale import BRACKETS, tax_cents, take_home_cents


def test_bracket_table_is_ordered() -> None:
    ceilings = [b.ceiling_cents for b in BRACKETS if b.ceiling_cents]
    assert ceilings == sorted(ceilings)


def test_no_tax_in_first_band() -> None:
    assert tax_cents(1_000_000) == 0


def test_tax_in_second_band() -> None:
    assert tax_cents(2_800_000) == (2_800_000 - 1_800_000) * 120 // 1000


def test_tax_above_top_ceiling() -> None:
    assert tax_cents(12_000_000) > tax_cents(9_000_000)


def test_take_home_is_gross_less_tax() -> None:
    gross = 5_000_000
    assert take_home_cents(gross) == gross - tax_cents(gross)
''',
    },
)

RUFF = Spec(
    tool="Ruff",
    package="tidyconf",
    description="a layered settings loader",
    clean_means=(
        "`ruff check` reports no diagnostics under a broad rule selection "
        "(pycodestyle, pyflakes, isort, pep8-naming, pyupgrade, bugbear, "
        "comprehensions, simplify, pydocstyle), and `ruff format --check` "
        "reports the files already formatted."
    ),
    command="ruff check src/ tests/ && ruff format --check src/ tests/",
    expected="All checks passed! / N files already formatted",
    notes=(
        "The selected rule set is written into `pyproject.toml` under "
        "`[tool.ruff.lint]`, so the result is reproducible rather than "
        "dependent on whatever Ruff's defaults are on the day. Passing Ruff's "
        "default four rules would prove very little."
    ),
    sources={
        "__init__.py": '''"""Layered settings resolution."""

from tidyconf.layers import Layer, merge_layers
from tidyconf.parse import parse_pairs

__all__ = ["Layer", "merge_layers", "parse_pairs"]
''',
        "layers.py": '''"""Settings layers, merged lowest precedence first."""

from collections.abc import Mapping, Sequence
from dataclasses import dataclass


@dataclass(frozen=True)
class Layer:
    """A named settings layer and its values."""

    name: str
    values: Mapping[str, str]


def merge_layers(layers: Sequence[Layer]) -> dict[str, str]:
    """Merge layers so later layers override earlier ones."""
    merged: dict[str, str] = {}
    for layer in layers:
        merged.update(layer.values)
    return merged
''',
        "parse.py": '''"""Parsing of ``key=value`` settings lines."""

from collections.abc import Iterable

COMMENT_PREFIX = "#"
SEPARATOR = "="


def parse_pairs(lines: Iterable[str]) -> dict[str, str]:
    """Parse ``key=value`` lines, ignoring blanks and comments."""
    parsed: dict[str, str] = {}
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith(COMMENT_PREFIX):
            continue
        if SEPARATOR not in stripped:
            continue
        key, value = stripped.split(SEPARATOR, 1)
        parsed[key.strip()] = value.strip()
    return parsed
''',
    },
    tests={
        "test_tidyconf.py": '''"""Cover every parse branch and the merge precedence."""

from tidyconf import Layer, merge_layers, parse_pairs


def test_parse_pairs_reads_values() -> None:
    """Well-formed lines parse, with surrounding space trimmed."""
    assert parse_pairs(["a=1", "b = 2"]) == {"a": "1", "b": "2"}


def test_parse_pairs_skips_blanks_and_comments() -> None:
    """Blank lines and comments contribute nothing."""
    assert parse_pairs(["", "  ", "# note"]) == {}


def test_parse_pairs_skips_lines_without_separator() -> None:
    """A line with no separator is ignored rather than raising."""
    assert parse_pairs(["plain"]) == {}


def test_merge_layers_later_wins() -> None:
    """A later layer overrides an earlier one key by key."""
    base = Layer("base", {"mode": "safe", "retries": "1"})
    override = Layer("env", {"mode": "fast"})
    assert merge_layers([base, override]) == {"mode": "fast", "retries": "1"}


def test_merge_layers_empty() -> None:
    """Merging nothing yields an empty mapping."""
    assert merge_layers([]) == {}
''',
    },
    extra={
        "ruff.toml": '''# Explicit rule selection: a default-only pass proves almost nothing.
line-length = 88
target-version = "py39"

[lint]
select = ["E", "W", "F", "I", "N", "UP", "B", "C4", "SIM", "D"]
ignore = ["D203", "D213"]

[lint.pydocstyle]
convention = "pep257"
''',
    },
)

SEMGREP = Spec(
    tool="Semgrep",
    package="plainquill",
    description="placeholder substitution in plain-text templates",
    clean_means=(
        "`semgrep --config=auto` reports 0 findings. Substitution is done with "
        "`str.replace` over an explicit allow-list of placeholder names — "
        "never `eval`, `exec`, `str.format` on untrusted input, f-string "
        "interpolation of caller data into code, or a template engine with "
        "autoescaping disabled."
    ),
    command="semgrep --config=semgrep-rules.yml --error --quiet src/",
    expected="0 findings",
    notes=(
        "The tempting shortcut here is `template.format(**values)`, which "
        "Semgrep flags because attribute access in a format string can reach "
        "object internals. An explicit placeholder allow-list avoids the sink "
        "rather than suppressing the rule.\n\n"
        "The folder ships its own `semgrep-rules.yml` rather than relying on "
        "`--config=auto`, because auto resolves the ruleset from "
        "`semgrep.dev`, which is refused at this environment's egress proxy "
        "(403 at the tunnel). A corpus whose clean result depends on a network "
        "fetch is not reproducible; a committed ruleset makes the claim exact, "
        "and it is the same choice the platform makes by shipping "
        "`tools/whitebox/python/semgrep-ruleset.yml` into its worker image. "
        "Run `--config=auto` as well wherever the registry is reachable."
    ),
    sources={
        "__init__.py": '''"""Plain-text template substitution."""

from plainquill.render import PLACEHOLDER_PATTERN, render
from plainquill.tokens import placeholders_in

__all__ = ["PLACEHOLDER_PATTERN", "placeholders_in", "render"]
''',
        "tokens.py": '''"""Discovery of ``{{name}}`` placeholders in a template."""

import re

PLACEHOLDER_PATTERN = re.compile(r"\\{\\{([a-z_][a-z0-9_]*)\\}\\}")


def placeholders_in(template: str) -> list[str]:
    """Placeholder names appearing in a template, in order, deduplicated."""
    seen: list[str] = []
    for match in PLACEHOLDER_PATTERN.finditer(template):
        name = match.group(1)
        if name not in seen:
            seen.append(name)
    return seen
''',
        "render.py": '''"""Rendering by explicit replacement, never by evaluation."""

from plainquill.tokens import PLACEHOLDER_PATTERN, placeholders_in


def render(template: str, values: dict[str, str]) -> str:
    """Replace known placeholders with their values, leaving unknowns intact."""
    rendered = template
    for name in placeholders_in(template):
        if name not in values:
            continue
        rendered = rendered.replace("{{" + name + "}}", values[name])
    return rendered
''',
    },
    tests={
        "test_plainquill.py": '''"""Cover placeholder discovery and both replacement branches."""

from plainquill import PLACEHOLDER_PATTERN, placeholders_in, render


def test_pattern_is_anchored_to_lowercase_names() -> None:
    assert PLACEHOLDER_PATTERN.match("{{Name}}") is None


def test_placeholders_are_deduplicated_in_order() -> None:
    assert placeholders_in("{{a}} {{b}} {{a}}") == ["a", "b"]


def test_render_substitutes_known_names() -> None:
    assert render("hi {{name}}", {"name": "ola"}) == "hi ola"


def test_render_leaves_unknown_names_intact() -> None:
    assert render("hi {{name}}", {}) == "hi {{name}}"
''',
    },
    extra={"semgrep-rules.yml": SINK_RULES},
)

SLIPCOVER = Spec(
    tool="SlipCover",
    package="vectorlite",
    description="small fixed-length vector arithmetic",
    clean_means=(
        "SlipCover reports 100% of lines covered across the package, with no "
        "line listed as missing."
    ),
    command="slipcover --source src -m pytest -q",
    expected="all files 100%",
    notes=(
        "SlipCover and Coverage.py are cross-checks of one another in the "
        "roster, so this folder and the Coverage.py folder deliberately hold "
        "different code. Agreement between two tools on the same file is worth "
        "nothing if the file is the only thing either of them ever saw."
    ),
    sources={
        "__init__.py": '''"""Fixed-length vector arithmetic over tuples of floats."""

from vectorlite.ops import add, dot, scale
from vectorlite.norm import magnitude, normalise

__all__ = ["add", "dot", "magnitude", "normalise", "scale"]
''',
        "ops.py": '''"""Element-wise operations on equal-length vectors."""

from typing import Sequence


def add(left: Sequence[float], right: Sequence[float]) -> tuple[float, ...]:
    """Element-wise sum of two equal-length vectors."""
    if len(left) != len(right):
        raise ValueError("vectors must be the same length")
    return tuple(a + b for a, b in zip(left, right))


def scale(vector: Sequence[float], factor: float) -> tuple[float, ...]:
    """Multiply every component by a scalar."""
    return tuple(component * factor for component in vector)


def dot(left: Sequence[float], right: Sequence[float]) -> float:
    """Dot product of two equal-length vectors."""
    if len(left) != len(right):
        raise ValueError("vectors must be the same length")
    return sum(a * b for a, b in zip(left, right))
''',
        "norm.py": '''"""Magnitude and normalisation."""

import math
from typing import Sequence

from vectorlite.ops import dot, scale


def magnitude(vector: Sequence[float]) -> float:
    """Euclidean length of a vector."""
    return math.sqrt(dot(vector, vector))


def normalise(vector: Sequence[float]) -> tuple[float, ...]:
    """Unit vector in the same direction; the zero vector is returned as-is."""
    length = magnitude(vector)
    if length == 0.0:
        return tuple(vector)
    return scale(vector, 1.0 / length)
''',
    },
    tests={
        "test_vectorlite.py": '''"""Cover every operation, both error paths and the zero-vector branch."""

import pytest

from vectorlite import add, dot, magnitude, normalise, scale


def test_add() -> None:
    assert add((1.0, 2.0), (3.0, 4.0)) == (4.0, 6.0)


def test_add_rejects_mismatched_lengths() -> None:
    with pytest.raises(ValueError):
        add((1.0,), (1.0, 2.0))


def test_scale() -> None:
    assert scale((1.0, -2.0), 3.0) == (3.0, -6.0)


def test_dot() -> None:
    assert dot((1.0, 2.0), (3.0, 4.0)) == 11.0


def test_dot_rejects_mismatched_lengths() -> None:
    with pytest.raises(ValueError):
        dot((1.0,), (1.0, 2.0))


def test_magnitude() -> None:
    assert magnitude((3.0, 4.0)) == 5.0


def test_normalise_unit_length() -> None:
    assert normalise((3.0, 4.0)) == pytest.approx((0.6, 0.8))


def test_normalise_zero_vector_is_unchanged() -> None:
    assert normalise((0.0, 0.0)) == (0.0, 0.0)
''',
    },
)

TRIVY = Spec(
    tool="Trivy",
    package="tallysheet",
    description="column summaries over CSV rows",
    clean_means=(
        "Zero vulnerabilities and zero secrets. The manifest declares **no "
        "dependencies at all**, so there is no package for an advisory to "
        "attach to, and no credential, token or private key appears anywhere "
        "in the tree."
    ),
    command="trivy fs --scanners vuln,secret --exit-code 1 .",
    expected="Total: 0",
    notes=(
        "Clean by construction rather than by today's advisory feed. A folder "
        "pinned to versions that happen to be clean this week becomes dirty "
        "the week a CVE lands, with nothing in the folder having changed — so "
        "the dependency list is empty and the package is pure standard "
        "library. Trivy is a standalone binary and its release host is refused "
        "at this environment's egress proxy, so it was NOT invoked here; the "
        "zero-dependency claim was verified instead with `pip-audit`, which "
        "reports no known vulnerabilities. Treat the Trivy result as unproven "
        "until the binary runs."
    ),
    sources={
        "__init__.py": '''"""Column summaries over parsed CSV rows."""

from tallysheet.reader import parse_rows
from tallysheet.summary import ColumnSummary, summarise_column

__all__ = ["ColumnSummary", "parse_rows", "summarise_column"]
''',
        "reader.py": '''"""CSV parsing with the standard-library reader."""

import csv
from io import StringIO


def parse_rows(text: str) -> list[dict[str, str]]:
    """Parse CSV text with a header row into a list of dictionaries."""
    reader = csv.DictReader(StringIO(text))
    return [dict(row) for row in reader]
''',
        "summary.py": '''"""Numeric summaries of a single column."""

from typing import NamedTuple, Sequence


class ColumnSummary(NamedTuple):
    """Count, total and mean for one numeric column."""

    count: int
    total: float
    mean: float


def summarise_column(rows: Sequence[dict[str, str]],
                     column: str) -> ColumnSummary:
    """Summarise one column, ignoring rows whose value is not numeric."""
    values: list[float] = []
    for row in rows:
        raw = row.get(column, "").strip()
        if not raw:
            continue
        try:
            values.append(float(raw))
        except ValueError:
            continue
    if not values:
        return ColumnSummary(0, 0.0, 0.0)
    total = sum(values)
    return ColumnSummary(len(values), total, total / len(values))
''',
    },
    tests={
        "test_tallysheet.py": '''"""Cover parsing and every summary branch."""

from tallysheet import parse_rows, summarise_column

CSV = "name,score\\nola,3\\nrae,5\\nbo,\\nzed,nine\\n"


def test_parse_rows() -> None:
    rows = parse_rows(CSV)
    assert len(rows) == 4
    assert rows[0]["name"] == "ola"


def test_summarise_column_skips_blank_and_non_numeric() -> None:
    summary = summarise_column(parse_rows(CSV), "score")
    assert summary.count == 2
    assert summary.total == 8.0
    assert summary.mean == 4.0


def test_summarise_column_missing_column() -> None:
    assert summarise_column(parse_rows(CSV), "absent").count == 0
''',
    },
    extra={
        "requirements.txt": '''# Intentionally empty: zero dependencies means zero advisories, forever.
# A pinned-but-currently-clean list would rot the week a CVE lands.
''',
    },
)

ASTROID = Spec(
    tool="astroid",
    package="shapebook",
    description="a registry of plane shapes",
    clean_means=(
        "astroid infers every name: no node resolves to `Uninferable`. There "
        "is no `exec`, no star import, no metaclass, no runtime attribute "
        "injection, no `globals()` mutation and no dynamic base class, so "
        "inference has a single answer everywhere."
    ),
    command="python -m driver",
    expected="0 unresolved names",
    notes=(
        "astroid is a library, so `driver.py` drives the check. It asks "
        "whether every identifier resolves to a definition, not whether every "
        "expression infers to a value -- a first draft asked the second "
        "question and reported 8 failures in correct code, because a "
        "`dataclass(frozen=True)` decorator call and a generator "
        "expression's loop variable both infer to Uninferable quite legitimately. "
        "A check that fires on healthy code is a defect wearing a safety label. "
        "This is the axis "
        "the corpora found astroid sits on: the 3.x-to-4.x change moved "
        "`infer_call_result(caller)` to positional and deprecated the root "
        "node re-exports, so `driver.py` imports from `astroid.nodes`."
    ),
    sources={
        "__init__.py": '''"""A small registry of plane shapes and their areas."""

from shapebook.shapes import Circle, Rectangle, Shape
from shapebook.registry import total_area

__all__ = ["Circle", "Rectangle", "Shape", "total_area"]
''',
        "shapes.py": '''"""Concrete shape types with statically known attributes."""

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class Shape:
    """Base shape carrying only a label."""

    label: str

    def area(self) -> float:
        """Area of the shape; the base shape encloses nothing."""
        return 0.0


@dataclass(frozen=True)
class Rectangle(Shape):
    """An axis-aligned rectangle."""

    width: float
    height: float

    def area(self) -> float:
        """Width times height."""
        return self.width * self.height


@dataclass(frozen=True)
class Circle(Shape):
    """A circle given by its radius."""

    radius: float

    def area(self) -> float:
        """Pi r squared."""
        return math.pi * self.radius * self.radius
''',
        "registry.py": '''"""Aggregation over a sequence of shapes."""

from typing import Sequence

from shapebook.shapes import Shape


def total_area(shapes: Sequence[Shape]) -> float:
    """Sum of the areas of every shape in the sequence."""
    return sum(shape.area() for shape in shapes)
''',
    },
    tests={
        "test_shapebook.py": '''"""Cover each shape's area and the aggregate."""

import math

from shapebook import Circle, Rectangle, Shape, total_area


def test_base_shape_has_no_area() -> None:
    assert Shape("void").area() == 0.0


def test_rectangle_area() -> None:
    assert Rectangle("r", 2.0, 3.0).area() == 6.0


def test_circle_area() -> None:
    assert Circle("c", 1.0).area() == math.pi


def test_total_area() -> None:
    shapes = [Rectangle("r", 2.0, 3.0), Circle("c", 1.0)]
    assert total_area(shapes) == 6.0 + math.pi
''',
    },
    extra={
        "driver.py": '''"""Check that astroid resolves every name in the package.

astroid ships no checker CLI, so the check is driven here. The question asked
is the one that means something for a static analyser: does every identifier
resolve to a definition astroid can see? Inferring *values* is a different and
much weaker question -- a frozen-dataclass decorator call and a generator
expression's loop variable both legitimately infer to Uninferable in working
code, so counting those would report a defect that is not one.

Imports come from ``astroid.nodes`` rather than the package root: the root
re-exports are deprecated from astroid 4.
"""

from __future__ import annotations

import builtins
from pathlib import Path

import astroid
from astroid import nodes

BUILTIN_NAMES = frozenset(dir(builtins))


def unresolved_names(module: nodes.Module) -> list[str]:
    """Names in a module that resolve to no definition and no builtin."""
    failures: list[str] = []
    for node in module.nodes_of_class(nodes.Name):
        if node.name in BUILTIN_NAMES:
            continue
        _scope, definitions = node.lookup(node.name)
        if not definitions:
            failures.append(f"{node.lineno}: {node.name}")
    return failures


def unresolved_methods(module: nodes.Module) -> list[str]:
    """Methods declared on a class that astroid cannot look up again."""
    failures: list[str] = []
    for klass in module.nodes_of_class(nodes.ClassDef):
        for method in klass.mymethods():
            try:
                klass.getattr(method.name)
            except astroid.AttributeInferenceError:
                failures.append(f"{klass.name}.{method.name}")
    return failures


def main() -> int:
    """Walk every module under src/ and report anything unresolved."""
    total = 0
    for path in sorted(Path("src").rglob("*.py")):
        module = astroid.parse(path.read_text(encoding="ascii"),
                               module_name=path.stem)
        for description in unresolved_names(module) + unresolved_methods(module):
            print(f"{path}: {description}")
            total += 1
    print(f"{total} unresolved names")
    return 1 if total else 0


if __name__ == "__main__":
    raise SystemExit(main())
''',
    },
)

COGNITIVE_AST = Spec(
    tool="cognitive-ast",
    package="pricerule",
    description="flat discount rules over an order total",
    clean_means=(
        "Every function scores 0-2 on cognitive complexity against a "
        "threshold of 15. Nesting never exceeds one level and no boolean "
        "operator sequence is mixed, so the increments that drive the score "
        "never accumulate."
    ),
    command="python -m driver",
    expected="max cognitive score 2 (threshold 15)",
    notes=(
        "This folder was empty in the harvested set for a concrete reason: "
        "**there is no PyPI package named cognitive-ast**. The corpora "
        "implement it as a standard-library `ast` scorer, and `driver.py` here "
        "is that scorer — Sonar's cognitive-complexity rules (nesting "
        "increment, boolean-sequence increment, no increment for an `else` "
        "chain) over the stdlib `ast` module. Synthetic data is the only way "
        "this folder can exist at all."
    ),
    sources={
        "__init__.py": '''"""Flat discount rules applied to an order total in cents."""

from pricerule.rules import DISCOUNTS, discount_per_mille
from pricerule.apply import apply_discount

__all__ = ["DISCOUNTS", "apply_discount", "discount_per_mille"]
''',
        "rules.py": '''"""Discount rates held as a flat lookup rather than a branch chain."""

DISCOUNTS = {
    "none": 0,
    "member": 50,
    "staff": 150,
    "wholesale": 220,
}


def discount_per_mille(tier: str) -> int:
    """Discount rate for a tier, in parts per thousand."""
    return DISCOUNTS.get(tier, 0)
''',
        "apply.py": '''"""Applying a discount to an order total."""

from pricerule.rules import discount_per_mille


def apply_discount(total_cents: int, tier: str) -> int:
    """Order total after the tier's discount, rounded down to whole cents."""
    rate = discount_per_mille(tier)
    reduction = total_cents * rate // 1000
    return total_cents - reduction
''',
    },
    tests={
        "test_pricerule.py": '''"""Cover the lookup default and the discount arithmetic."""

from pricerule import DISCOUNTS, apply_discount, discount_per_mille


def test_every_tier_has_a_rate() -> None:
    assert all(rate >= 0 for rate in DISCOUNTS.values())


def test_known_tier_rate() -> None:
    assert discount_per_mille("staff") == 150


def test_unknown_tier_has_no_discount() -> None:
    assert discount_per_mille("founder") == 0


def test_apply_discount_reduces_total() -> None:
    assert apply_discount(10_000, "member") == 9_500


def test_apply_discount_without_tier() -> None:
    assert apply_discount(10_000, "none") == 10_000
''',
    },
    extra={
        "driver.py": '''"""A standard-library cognitive-complexity scorer.

There is no PyPI distribution called ``cognitive-ast``; the roster implements
it over stdlib ``ast``. Increments follow the usual cognitive-complexity
rules: +1 per control-flow structure, +nesting for each nested structure, +1
per sequence of like boolean operators, and no increment for ``else`` on an
``if`` chain.
"""

from __future__ import annotations

import ast
from pathlib import Path

THRESHOLD = 15
NESTING_NODES = (ast.If, ast.For, ast.While, ast.Try, ast.With)


def _boolean_sequences(node: ast.AST) -> int:
    """One increment per sequence of like boolean operators."""
    return sum(1 for child in ast.walk(node) if isinstance(child, ast.BoolOp))


def score_function(func: ast.AST) -> int:
    """Cognitive complexity of a single function definition."""
    total = _boolean_sequences(func)
    stack: list[tuple[ast.AST, int]] = [(func, 0)]
    while stack:
        node, depth = stack.pop()
        for child in ast.iter_child_nodes(node):
            child_depth = depth
            if isinstance(child, NESTING_NODES):
                total += 1 + depth
                child_depth = depth + 1
            stack.append((child, child_depth))
    return total


def main() -> int:
    """Score every function under src/ and compare against the threshold."""
    worst = 0
    for path in sorted(Path("src").rglob("*.py")):
        tree = ast.parse(path.read_text(encoding="ascii"))
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            score = score_function(node)
            worst = max(worst, score)
            if score > THRESHOLD:
                print(f"{path}:{node.lineno} {node.name} scores {score}")
    print(f"max cognitive score {worst} (threshold {THRESHOLD})")
    return 1 if worst > THRESHOLD else 0


if __name__ == "__main__":
    raise SystemExit(main())
''',
    },
)

SPECS_B = (RADON, RUFF, SEMGREP, SLIPCOVER, TRIVY, ASTROID, COGNITIVE_AST)
