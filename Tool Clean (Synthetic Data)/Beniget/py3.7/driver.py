"""Run beniget over the package and report unbound identifiers.

beniget ships no command-line entry point, so the check is driven here.
Exits non-zero if any identifier fails to resolve.
"""

from __future__ import annotations
from typing import List

import sys
from pathlib import Path

import beniget
import gast


def unbound_names(source: str) -> List[str]:
    """Identifiers beniget cannot bind to a definition."""
    tree = gast.parse(source)
    collector = beniget.DefUseChains()
    collector.visit(tree)
    return [str(name) for name in collector._undefs]


def main() -> int:
    """Check every module under src/ and print the total."""
    total = 0
    for path in sorted(Path("src").rglob("*.py")):
        names = unbound_names(path.read_text(encoding="ascii"))
        for name in names:
            print(f"{path}: unbound {name}")
        total += len(names)
    print(f"{total} unbound identifiers")
    return 1 if total else 0


if __name__ == "__main__":
    raise SystemExit(main())
