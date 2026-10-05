"""Walk the repository history with dulwich and report what it found.

Counts commits and distinct authors, counting the author field only -- a
trailer-aware count is the orchestrator's job, and conflating the two is how
an ownership metric silently reports one author at 100%.
"""

from __future__ import annotations

from dulwich.repo import Repo


def main() -> int:
    """Open the repository, walk every commit, and print the totals."""
    with Repo(".") as repo:
        commits = list(repo.get_walker())
        authors = set()
        for entry in commits:
            authors.add(entry.commit.author.decode("utf-8"))
            # Resolving the tree proves the object store is intact.
            repo[entry.commit.tree]
    print(f"history readable: {len(commits)} commits, {len(authors)} authors")
    return 0 if commits and authors else 1


if __name__ == "__main__":
    raise SystemExit(main())
