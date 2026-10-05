"""A standard-library cognitive-complexity scorer.

There is no PyPI distribution called ``cognitive-ast``; the roster implements
it over stdlib ``ast``. Increments follow the usual cognitive-complexity
rules: +1 per control-flow structure, +nesting for each nested structure, +1
per sequence of like boolean operators, and no increment for ``else`` on an
``if`` chain.
"""

from __future__ import annotations
from typing import List, Tuple

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
    stack: List[Tuple[ast.AST, int]] = [(func, 0)]
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
