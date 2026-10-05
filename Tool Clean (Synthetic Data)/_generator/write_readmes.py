#!/usr/bin/env python3
"""Write each tool folder's README.md from meta.py."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from meta import TOOLS  # noqa: E402

_here = Path(__file__).resolve().parent
# Dev layout: this script lives in <corpus-root>/gen/, folders in <corpus-root>/out/.
# Delivered layout: this script lives in <corpus-root>/_generator/, folders are siblings.
ROOT = _here.parent / "out" if (_here.parent / "out").is_dir() else _here.parent


def render(entry: dict) -> str:
    status_line = (
        "**Measured**: installed (or built from real source) and actually "
        "invoked in the build environment; the result below is real, not "
        "asserted."
        if entry["status"] == "measured"
        else "**Not installed here**: see Notes for why, and what was "
        "checked instead."
    )
    lines = [
        f"# {entry['tool']}",
        "",
        f"Synthetic, clean-by-design TypeScript project for **{entry['tool']}**.",
        "",
        f"Package: {entry['package']}",
        "",
        f"Domain: {entry['domain']}",
        "",
        status_line,
    ]
    if entry.get("standin"):
        lines += ["", f"Stand-in tool actually run: `{entry['standin']}`"]
    lines += [
        "",
        "## What a passing result looks like",
        "",
        entry["clean_means"],
        "",
        "## Command",
        "",
        "```bash",
        entry["command"],
        "```",
    ]
    if entry["notes"]:
        lines += ["", "## Notes", "", entry["notes"]]
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    written = 0
    for entry in TOOLS:
        folder = ROOT / entry["tool"]
        if not folder.is_dir():
            print(f"missing folder: {entry['tool']}", file=sys.stderr)
            return 1
        (folder / "README.md").write_text(render(entry), encoding="utf-8")
        written += 1
    print(f"wrote {written} READMEs")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
