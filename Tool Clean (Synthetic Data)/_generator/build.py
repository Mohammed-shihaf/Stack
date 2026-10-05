"""Generate a clean, 100%-passing Python tool corpus — one folder per tool.

Mirrors the folder names of ``Desktop\\Python Tools`` (harvested upstream test
suites) but the content is synthetic and built to the opposite goal: every tool
must report **nothing wrong**. It is the negative control the corpora lack —
a family where nothing fires cannot distinguish "correctly detected nothing"
from "the scan never ran", so a clean baseline is what makes a zero legible.

Design rules every folder obeys, so that each project is clean for *its* tool
without tripping any of the others:

* no ``assert`` in ``src/`` (bandit B101 has no exemption there; asserts live
  in ``tests/`` only)
* module, class and function docstrings everywhere (pylint C0114/C0115/C0116)
* cyclomatic complexity <= 5 per function (radon rank A, lizard CCN)
* cognitive complexity well under 15 (complexipy)
* every definition referenced by a test (vulture reports no dead code)
* no dynamic dispatch, ``*`` imports, ``exec``, ``eval``, metaclasses or
  monkey-patching (astroid infers every name; pyan3 resolves every call)
* **no PEP 695 syntax anywhere** — ``type X = ...``, ``def f[T]()``,
  ``class C[T]``. beniget 0.5.0 has no visitor for ``gast.TypeVar`` and reports
  one false unbound identifier per *use* of a type parameter, at exit 0. A
  100%-passing beniget folder is only possible while that syntax is absent.
* zero third-party imports and a dependency manifest with no requirements, so
  pip-audit and Trivy are clean by construction rather than by today's CVE feed
* every folder a different domain, vocabulary and structural idiom, so jscpd
  and symilar find no clones within a folder or across the tree

The generator is idempotent: it clears each folder's generated content before
writing, and never touches ``.git``.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from specs import SPECS  # noqa: E402

PRESERVE = {".git"}

#: State the tools write while running. Generated, never corpus content: a
#: leftover ``mutants/`` tree is a clone group, and a stale ``.coverage`` makes
#: a coverage claim that no current run supports.
GENERATED = (
    "mutants", ".mutmut-cache", ".testmondata", ".coverage", "coverage.xml",
    "session.sqlite", "graph.dot", "__pycache__", ".pytest_cache",
    ".ruff_cache", "html-report", ".slipcover",
)

GITIGNORE = "\n".join(GENERATED) + "\n*.pyc\n"




def _pyproject(package: str, description: str) -> str:
    """Minimal PEP 621 manifest: identifies the project root, declares no deps."""
    return f'''[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[project]
name = "{package.replace("_", "-")}"
version = "1.0.0"
description = "{description}"
requires-python = ">=3.9"
dependencies = []

[tool.setuptools.packages.find]
where = ["src"]

# Makes the src layout importable without installing and without a conftest
# shim in every folder -- 28 copies of the same shim is a clone group, and the
# duplicate detectors in this corpus are right to say so.
[tool.pytest.ini_options]
pythonpath = ["src"]
testpaths = ["tests"]
'''


def _readme(spec) -> str:
    """Per-folder README: what clean means for this tool and how to prove it."""
    lines = [
        f"# {spec.tool}",
        "",
        f"Synthetic, clean-by-design Python project for **{spec.tool}**.",
        "",
        f"Domain: {spec.description}.",
        "",
        "## What a passing result looks like",
        "",
        spec.clean_means,
        "",
        "## Command",
        "",
        "```bash",
        spec.command,
        "```",
        "",
        f"Expected: `{spec.expected}`",
        "",
        "## Layout",
        "",
        "```text",
        f"{spec.package}/",
        "  pyproject.toml      project root marker; zero dependencies",
        "  src/" + spec.package + "/",
    ]
    for name in spec.sources:
        lines.append(f"    {name}")
    lines.append("  tests/")
    for name in spec.tests:
        lines.append(f"    {name}")
    for name in spec.extra:
        lines.append(f"  {name}")
    lines += [
        "```",
        "",
        "## Notes",
        "",
        spec.notes,
        "",
    ]
    return "\n".join(lines)


def _clear(folder: Path) -> None:
    """Remove generated content, preserving anything in PRESERVE."""
    if not folder.exists():
        return
    for child in folder.iterdir():
        if child.name in PRESERVE:
            continue
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()


# Typographic characters that creep in through prose, mapped to ASCII.
# The whole tree is held to ASCII on purpose: not every analyser in the roster
# reads source with the build file's declared encoding rather than the platform
# default, so a stray non-ASCII byte can change what a tool reports without
# changing what the interpreter accepts. That is precisely the class of silent
# difference this corpus exists to rule out, so it must not originate here.
_ASCII_MAP = str.maketrans({
    "—": "--", "–": "-", "‘": "'", "’": "'",
    "“": '"', "”": '"', "…": "...", " ": " ",
    "→": "->", "×": "x",
})


def _to_ascii(text: str) -> str:
    """Normalise typographic characters, then prove the result is ASCII."""
    converted = text.translate(_ASCII_MAP)
    converted.encode("ascii")  # raises if anything non-ASCII survived
    return converted


def _write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    body = _to_ascii(text)
    if not body.endswith("\n"):
        body += "\n"
    path.write_text(body, encoding="ascii")


def _init_git(folder: Path, spec) -> None:
    """Build a real, multi-author history for the history-mining tools."""
    env = dict(os.environ, GIT_TERMINAL_PROMPT="0")
    run = lambda *a: subprocess.run(a, cwd=folder, env=env, check=True,
                                    capture_output=True)
    if (folder / ".git").exists():
        shutil.rmtree(folder / ".git")
    run("git", "init", "-q", "-b", "main")
    run("git", "config", "user.name", "Corpus Author")
    run("git", "config", "user.email", "corpus@example.invalid")
    run("git", "config", "commit.gpgsign", "false")

    authors = [
        ("Ada Renwick", "ada.renwick@example.invalid"),
        ("Mikkel Aas", "mikkel.aas@example.invalid"),
        ("Priya Nallan", "priya.nallan@example.invalid"),
    ]
    files = sorted(p for p in folder.rglob("*") if p.is_file()
                   and ".git" not in p.parts)
    # One commit per file, cycling authors, so churn and ownership are real.
    for index, path in enumerate(files):
        rel = path.relative_to(folder).as_posix()
        name, email = authors[index % len(authors)]
        run("git", "add", "--", rel)
        subprocess.run(
            ["git", "commit", "-q", "-m", f"Add {rel}",
             "--author", f"{name} <{email}>"],
            cwd=folder, env=env, check=True, capture_output=True,
        )
    if spec.needs_diff_branch:
        # diff-cover compares a branch against a base, so it needs a real
        # diff. The added function and the test that covers it land in the
        # same commit: a diff containing only new, untested code reports 0%,
        # and one containing no executable lines reports nothing at all.
        run("git", "checkout", "-q", "-b", "feature")
        for rel, appended in spec.diff_files.items():
            target = folder / rel
            target.write_text(target.read_text(encoding="ascii") + appended,
                              encoding="ascii")
        run("git", "add", "-A")
        subprocess.run(
            ["git", "commit", "-q", "-m", "Extend the reporting helper",
             "--author", "Ada Renwick <ada.renwick@example.invalid>"],
            cwd=folder, env=env, check=True, capture_output=True,
        )


def build(root: Path, only: set[str] | None = None) -> list[str]:
    """Write every folder. Returns the folder names written."""
    root.mkdir(parents=True, exist_ok=True)
    written: list[str] = []
    for spec in SPECS:
        if only and spec.tool not in only:
            continue
        folder = root / spec.tool
        _clear(folder)
        _write(folder / "pyproject.toml",
               _pyproject(spec.package, spec.description))
        _write(folder / "README.md", _readme(spec))
        if ".gitignore" not in spec.extra:
            _write(folder / ".gitignore", GITIGNORE)
        for name, body in spec.sources.items():
            _write(folder / "src" / spec.package / name, body)
        for name, body in spec.tests.items():
            _write(folder / "tests" / name, body)
        for name, body in spec.extra.items():
            _write(folder / name, body)
        if spec.needs_git:
            _init_git(folder, spec)
        written.append(spec.tool)
    return written


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("out", help="output directory")
    parser.add_argument("--only", action="append", default=[],
                        help="build just this tool folder (repeatable)")
    args = parser.parse_args()
    names = build(Path(args.out), set(args.only) or None)
    print(f"wrote {len(names)} tool folders to {args.out}")
    for name in names:
        print(f"  {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
