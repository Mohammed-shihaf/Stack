"""Parse pyan3's own generated graph.dot and report the orphan ratio.

This is not part of the tool invocation -- the command this project is
checked with is exactly the one in README.md, unchanged. This script only
reads pyan3's own real output (the DOT file that command writes) to count
total function/class definitions against definitions with zero incoming
edges, so the reported percentage comes from pyan3's own graph, not a
separately invented count.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

NODE_RE = re.compile(
    r'"([A-Za-z0-9_]+)"\s*\[label="[^"]+".*?tooltip="[^"]*\\n'
    r'[^"]*\\n(?:function|class) in',
)
EDGE_RE = re.compile(r'"([A-Za-z0-9_]+)"\s*->\s*"([A-Za-z0-9_]+)"')


def main() -> int:
    """Report defs vs. defs with zero incoming edges in a pyan3 DOT graph."""
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "graph.dot")
    text = path.read_text()

    defs = set(NODE_RE.findall(text))
    incoming = {dst for _src, dst in EDGE_RE.findall(text) if dst in defs}
    orphans = sorted(defs - incoming)

    for name in orphans:
        print(f"orphan: {name}")
    total = len(defs)
    count = len(orphans)
    print(f"{count} orphaned definitions")
    if total:
        percent = 100 * count // total
        print(f"{count} of {total} definitions have zero incoming call "
              f"edges ({percent}%)")
    return 1 if count else 0


if __name__ == "__main__":
    raise SystemExit(main())
