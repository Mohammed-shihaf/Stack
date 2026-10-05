"""Run every tool against its folder and report what it actually found.

Exit-code vocabulary is the corpora's, kept deliberately apart:

    0  CLEAN         the tool ran and reported nothing
    1  FINDINGS      the tool ran and reported something -- a real failure
    4  NOT INSTALLED absent from this host -- a setup gap, not a result

Collapsing 1 and 4 would let a missing binary masquerade as a clean scan, which
is the exact failure this corpus exists to make impossible.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

CLEAN, FINDINGS, NOT_INSTALLED = 0, 1, 4

# tool folder -> (binary that must exist, shell command, ok predicate)
# The predicate gets (returncode, stdout+stderr) and decides CLEAN vs FINDINGS,
# because several of these tools use a non-zero exit for "found something"
# rather than "crashed".
CHECKS: dict[str, tuple[str, str]] = {
    "Bandit": ("bandit", "bandit -r src/ -q -f screen"),
    "Beniget": ("python3", "python3 driver.py"),
    "Coverage.py": ("coverage",
                    "coverage run --branch -m pytest -q && "
                    "coverage report -m --fail-under=100"),
    "CrossHair": ("crosshair",
                  "crosshair check src/spanmath --per_condition_timeout=15"),
    "Lizard": ("lizard", "lizard src/ -C 5 -L 40 -a 3 -w"),
    "Opengrep": ("opengrep", "opengrep --config=semgrep-rules.yml --error src/"),
    "Pymcdc": ("python3", "python3 driver.py"),
    "Radon": ("radon", "radon cc src/ -s -n B && radon mi src/ -n B"),
    "Ruff": ("ruff", "ruff check src/ tests/ && ruff format --check src/ tests/"),
    "Semgrep": ("semgrep", "semgrep --config=semgrep-rules.yml --error --quiet src/"),
    "SlipCover": ("slipcover", "slipcover --source src -m pytest -q"),
    "Trivy": ("trivy", "trivy fs --scanners vuln,secret --exit-code 1 ."),
    "astroid": ("python3", "python3 driver.py"),
    "cognitive-ast": ("python3", "python3 driver.py"),
    "complexipy": ("complexipy",
                   "complexipy src/ --max-complexity-allowed 8"),
    "cosmic-ray": ("cosmic-ray",
                   "cosmic-ray init cosmic-ray.toml session.sqlite && "
                   "cosmic-ray exec cosmic-ray.toml session.sqlite && "
                   "cr-report session.sqlite"),
    "diff-cover": ("diff-cover",
                   "coverage run --branch -m pytest -q && coverage xml && "
                   "diff-cover coverage.xml --compare-branch=main "
                   "--fail-under=100"),
    "dulwich": ("python3", "python3 driver.py"),
    "jscpd": ("jscpd",
              "jscpd src/ --min-lines 5 --min-tokens 30 --threshold 0 "
              "--reporters console"),
    "mutmut": ("mutmut", "mutmut run --max-children 4 && mutmut results"),
    "pip-audit": ("pip-audit",
                  "pip-audit --requirement requirements.txt --strict"),
    "pyan3": ("pyan3",
              "pyan3 src/pipeflow/*.py --uses --defines --colored --grouped "
              "--dot --file graph.dot"),
    "pydriller": ("python3", "python3 driver.py"),
    "pylint": ("pylint", "pylint src/shelfmark --fail-under=10"),
    "symilar": ("symilar",
                "symilar --duplicates=4 --ignore-comments "
                "--ignore-docstrings src/checkfour/postcode.py "
                "src/checkfour/checksum.py src/checkfour/membership.py "
                "src/checkfour/bounds.py"),
    "sys.settrace driver (stdlib)": ("python3", "python3 driver.py"),
    "testmon": ("python3",
                "rm -f .testmondata && python3 -m pytest --testmon -q && "
                "python3 -m pytest --testmon -q"),
    "vulture": ("vulture",
                'vulture src/ tests/ --min-confidence 60 '
                '--ignore-names "test_*"'),
}

# Tools whose non-zero exit means "found something" rather than "crashed" --
# already handled by treating any non-zero as FINDINGS. Tools that print
# findings while exiting 0 need an explicit output check, or they grade green
# while being wrong (the beniget lesson).
MUST_BE_SILENT = {"Lizard", "Radon", "vulture", "CrossHair"}


GENERATED = (
    "mutants", ".mutmut-cache", ".testmondata", ".coverage", "coverage.xml",
    "session.sqlite", "graph.dot", "__pycache__", ".pytest_cache",
    ".ruff_cache", ".slipcover",
)


def clean_generated(folder: Path) -> None:
    """Remove state a previous run wrote, so results never come from leftovers."""
    for name in GENERATED:
        for path in folder.rglob(name):
            if path.is_dir():
                shutil.rmtree(path, ignore_errors=True)
            elif path.exists():
                path.unlink()


def _binary_present(name: str) -> bool:
    return shutil.which(name) is not None


def run_check(root: Path, tool: str, verbose: bool) -> tuple[int, str]:
    """Run one tool's command in its folder. Returns (status, output tail)."""
    binary, command = CHECKS[tool]
    if not _binary_present(binary):
        return NOT_INSTALLED, f"{binary} not on PATH"

    folder = root / tool
    clean_generated(folder)
    env = dict(os.environ, PYTHONPATH=str(folder / "src"),
               PYTHONDONTWRITEBYTECODE="1", COLUMNS="100")
    proc = subprocess.run(command, cwd=folder, shell=True, env=env,
                          capture_output=True, text=True)
    output = (proc.stdout + proc.stderr).strip()
    if verbose and output:
        print(output)

    if proc.returncode != 0:
        return FINDINGS, output[-1500:]
    if tool in MUST_BE_SILENT and output:
        return FINDINGS, f"exit 0 but produced output:\n{output[-1200:]}"
    return CLEAN, output[-400:]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root")
    parser.add_argument("--only", action="append", default=[])
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    root = Path(args.root)
    tools = args.only or sorted(CHECKS)
    label = {CLEAN: "CLEAN", FINDINGS: "FINDINGS", NOT_INSTALLED: "NOT INSTALLED"}
    tally: dict[int, list[str]] = {CLEAN: [], FINDINGS: [], NOT_INSTALLED: []}

    for tool in tools:
        status, detail = run_check(root, tool, args.verbose)
        tally[status].append(tool)
        print(f"{label[status]:>14}  {tool}")
        if status == FINDINGS and detail:
            for line in detail.splitlines()[-14:]:
                print(f"                  | {line}")

    print()
    for tool in tools:
        clean_generated(root / tool)

    print(f"CLEAN {len(tally[CLEAN])}  "
          f"FINDINGS {len(tally[FINDINGS])}  "
          f"NOT INSTALLED {len(tally[NOT_INSTALLED])}")
    if tally[FINDINGS]:
        print("failing: " + ", ".join(tally[FINDINGS]))
    if tally[NOT_INSTALLED]:
        print("absent:  " + ", ".join(tally[NOT_INSTALLED]))
    return 1 if tally[FINDINGS] else 0


if __name__ == "__main__":
    raise SystemExit(main())
