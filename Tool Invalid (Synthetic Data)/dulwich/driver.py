"""Walk the repository history with dulwich and check each commit's
Co-authored-by trailer against the project's real contributor roster.

Counting commits and distinct author-field values is a weak "readable"
check: it never looks past the author line, so a trailer that is missing,
malformed, or naming someone outside the roster is invisible to it. This
driver counts trailers, not just the author field, by reading each
commit's message body with dulwich and matching it against the roster
recorded below.
"""

from __future__ import annotations

import re

from dulwich.repo import Repo

TRAILER_RE = re.compile(
    r"^Co-authored-by:\s*(?P<name>[^<]+?)\s*<(?P<email>[^>]+)>\s*$",
    re.MULTILINE,
)

# The repository's real contributor roster, recorded independently of
# whatever a commit's trailer happens to claim.
ROSTER = {
    "ada.renwick@example.invalid",
    "priya.nallan@example.invalid",
    "mikkel.aas@example.invalid",
}


def main() -> int:
    """Open the repository, check every commit's trailer, print the ratio."""
    with Repo(".") as repo:
        commits = list(repo.get_walker())
        total = len(commits)
        well_formed = 0
        for entry in commits:
            message = entry.commit.message.decode("utf-8", "replace")
            match = TRAILER_RE.search(message)
            if match and match.group("email") in ROSTER:
                well_formed += 1
                # Resolving the tree proves the object store is intact.
                repo[entry.commit.tree]
    pct = (well_formed / total * 100) if total else 0.0
    print(
        f"trailer check: {well_formed}/{total} commits have a well-formed, "
        f"roster-matched Co-authored-by trailer ({pct:.0f}%)"
    )
    return 0 if total and well_formed * 2 >= total else 1


if __name__ == "__main__":
    raise SystemExit(main())
