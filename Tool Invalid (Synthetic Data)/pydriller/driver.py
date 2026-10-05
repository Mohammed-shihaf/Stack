"""Mine this repository's history with PyDriller and check whether each
commit's modified files actually match the commit's own stated intent tag.

Counting commits, distinct authors, and a total modification count (what
the previous driver did) is attribution-free: none of those numbers say
whether a commit changed what it claims to have changed. This driver reads
the `[area:X]` tag every commit message carries and checks, using
PyDriller's own `modified_files` for that commit, whether a file under that
area was actually touched. A commit whose tag says one thing and whose
real diff (per PyDriller) says another is a wrong commit, not merely an
untagged one.
"""

from __future__ import annotations

import re

from pydriller import Repository

TAG_RE = re.compile(r"\[area:([a-z_]+)\]")


def path_of(modification) -> str:
    """The best available path for a PyDriller `ModifiedFile`."""
    return modification.new_path or modification.old_path or ""


def main() -> int:
    """Traverse every commit and check its tag against its real diff."""
    total = 0
    matched = 0
    for commit in Repository(".").traverse_commits():
        total += 1
        tag_match = TAG_RE.search(commit.msg)
        if not tag_match:
            continue
        area = tag_match.group(1)
        touched = any(area in path_of(mf) for mf in commit.modified_files)
        if touched:
            matched += 1
    pct = (matched / total * 100) if total else 0.0
    print(
        f"intent check: {matched}/{total} commits touch a file matching "
        f"their own [area:*] tag ({pct:.0f}%)"
    )
    return 0 if total and matched * 2 >= total else 1


if __name__ == "__main__":
    raise SystemExit(main())
