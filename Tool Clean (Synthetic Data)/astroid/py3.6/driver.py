"""Check that astroid resolves every name in the package.

astroid ships no checker CLI, so the check is driven here. The question asked
is the one that means something for a static analyser: does every identifier
resolve to a definition astroid can see? Inferring *values* is a different and
much weaker question -- a frozen-dataclass decorator call and a generator
expression's loop variable both legitimately infer to Uninferable in working
code, so counting those would report a defect that is not one.

Imports come from ``astroid.nodes`` rather than the package root: the root
re-exports are deprecated from astroid 4.
"""

from typing import List

import builtins
from pathlib import Path

import astroid
from astroid import nodes

BUILTIN_NAMES = frozenset(dir(builtins))


def unresolved_names(module: nodes.Module) -> List[str]:
    """Names in a module that resolve to no definition and no builtin."""
    failures: List[str] = []
    for node in module.nodes_of_class(nodes.Name):
        if node.name in BUILTIN_NAMES:
            continue
        _scope, definitions = node.lookup(node.name)
        if not definitions:
            failures.append(f"{node.lineno}: {node.name}")
    return failures


def unresolved_methods(module: nodes.Module) -> List[str]:
    """Methods declared on a class that astroid cannot look up again."""
    failures: List[str] = []
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
