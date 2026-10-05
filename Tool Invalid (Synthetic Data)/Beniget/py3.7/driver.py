"""Run beniget over the package and report genuinely unbound identifiers.

beniget ships no command-line entry point, so the check is driven here.
Clean's own driver reads ``collector._undefs`` directly after ``.visit()``
returns; that stack is a transient, per-loop bookkeeping structure beniget
itself always pops back to empty before ``.visit()`` finishes (see
``process_undefs`` in beniget.py), so reading it afterward cannot observe
anything -- it is ``[]`` whether the module is clean or riddled with
unbound names. The real signal beniget emits is the warning
``unbound_identifier`` prints the moment ``compute_defs`` fails to resolve a
name. This driver captures that real, genuine output instead, and counts
the total number of non-builtin identifier *uses* beniget is asked to
resolve, so the percentage below comes from the same population the
pass/fail check walks.
"""

from __future__ import annotations

import builtins
from typing import List
import contextlib
import io
from pathlib import Path

import beniget
import gast

BUILTIN_NAMES = frozenset(dir(builtins))


def examined_uses(tree: gast.AST) -> int:
    """Count non-builtin identifier loads beniget is asked to resolve."""
    count = 0
    for node in gast.walk(tree):
        if isinstance(node, gast.Name) and isinstance(node.ctx, gast.Load):
            if node.id not in BUILTIN_NAMES:
                count += 1
    return count


def unbound_warnings(tree: gast.AST) -> List[str]:
    """Real 'unbound identifier' warnings beniget prints while visiting."""
    collector = beniget.DefUseChains()
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        collector.visit(tree)
    return [line for line in buf.getvalue().splitlines()
            if line.startswith("W: unbound identifier")]


def main() -> int:
    """Check every module under src/ and print the total."""
    total_unbound = 0
    total_examined = 0
    for path in sorted(Path("src").rglob("*.py")):
        tree = gast.parse(path.read_text(encoding="ascii"))
        total_examined += examined_uses(tree)
        warnings = unbound_warnings(tree)
        for warning in warnings:
            print(f"{path}: {warning}")
        total_unbound += len(warnings)
    print(f"{total_unbound} unbound identifiers")
    if total_examined:
        percent = 100 * total_unbound // total_examined
        print(f"{total_unbound} of {total_examined} examined identifier "
              f"uses were unbound ({percent}%)")
    return 1 if total_unbound else 0


if __name__ == "__main__":
    raise SystemExit(main())
