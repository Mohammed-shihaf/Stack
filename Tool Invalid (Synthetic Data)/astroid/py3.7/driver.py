"""Check whether astroid resolves every name in the package.

Same question Clean's driver asks, and the same two checks: does every
identifier resolve to a definition astroid can see (``Name.lookup``), and
does every method a class declares resolve again through ``getattr`` on
that class. This package is engineered so most of those lookups
genuinely fail -- a wildcard import of a module that installs its
attributes at runtime, a value bound only inside an ``exec`` string, and a
name ``del``-ed before the return that reads it. The percentage below is
computed from the same ``Name`` nodes the pass/fail check walks, so it is
not a separate, invented number.

Imports come from ``astroid.nodes`` rather than the package root: the root
re-exports are deprecated from astroid 4.
"""

from __future__ import annotations

import builtins
from typing import List
from pathlib import Path

import astroid
from astroid import nodes

BUILTIN_NAMES = frozenset(dir(builtins))


def examined_names(module: nodes.Module) -> List[nodes.Name]:
    """Non-builtin Name (load) nodes this module asks astroid to resolve."""
    return [node for node in module.nodes_of_class(nodes.Name)
            if node.name not in BUILTIN_NAMES]


def unresolved_names(module: nodes.Module) -> List[str]:
    """Names in a module that resolve to no definition and no builtin."""
    failures: List[str] = []
    for node in examined_names(module):
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
    """Walk every module under src/ and report what astroid can't resolve."""
    total_failures = 0
    total_examined = 0
    for path in sorted(Path("src").rglob("*.py")):
        module = astroid.parse(path.read_text(encoding="ascii"),
                               module_name=path.stem)
        total_examined += len(examined_names(module))
        for description in unresolved_names(module) + unresolved_methods(module):
            print(f"{path}: {description}")
            total_failures += 1
    print(f"{total_failures} unresolved names")
    if total_examined:
        percent = 100 * total_failures // total_examined
        print(f"{total_failures} of {total_examined} examined names "
              f"failed to resolve ({percent}%)")
    return 1 if total_failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
