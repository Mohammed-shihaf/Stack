"""Mine this repository's history with PyDriller and report the totals.

Counts commits, distinct authors, and modifications per commit -- the three
facts a churn metric is built from.
"""

from __future__ import annotations

from pydriller import Repository


def main() -> int:
    """Traverse every commit and print commit and contributor counts."""
    commits = 0
    authors = set()
    modifications = 0
    for commit in Repository(".").traverse_commits():
        commits += 1
        authors.add(commit.author.email)
        modifications += len(commit.modified_files)
    print(f"{commits} commits, {len(authors)} contributors")
    print(f"{modifications} file modifications")
    return 0 if commits and authors else 1


if __name__ == "__main__":
    raise SystemExit(main())
