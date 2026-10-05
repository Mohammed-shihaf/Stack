"""Run every real tool against a specific version subfolder (py3.13, py3.14,
...). Adapted from the corpus's own verify.py -- same commands, same
exit-code vocabulary (0 clean, 1 findings, 4 not installed) -- just resolved
against <tool>/py<version>/ instead of a flat <tool>/.
"""
import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

CLEAN, FINDINGS, NOT_INSTALLED = 0, 1, 4

CHECKS = {
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
    "complexipy": ("complexipy", "complexipy src/ --max-complexity-allowed 8"),
    "cosmic-ray": ("cosmic-ray",
                   "cosmic-ray init cosmic-ray.toml session.sqlite && "
                   "cosmic-ray exec cosmic-ray.toml session.sqlite && "
                   "cr-report session.sqlite"),
    "jscpd": ("jscpd",
              "jscpd src/ --min-lines 5 --min-tokens 30 --threshold 0 "
              "--reporters console"),
    "mutmut": ("mutmut", "mutmut run --max-children 4 && mutmut results"),
    "pip-audit": ("pip-audit", "pip-audit --requirement requirements.txt --strict"),
    "pyan3": ("pyan3",
              "pyan3 src/pipeflow/*.py --uses --defines --colored --grouped "
              "--dot --file graph.dot"),
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
    "vulture": ("vulture", 'vulture src/ tests/ --min-confidence 60 --ignore-names "test_*"'),
}
MUST_BE_SILENT = {"Lizard", "Radon", "vulture", "CrossHair"}
GENERATED = ("mutants", ".mutmut-cache", ".testmondata", ".coverage", "coverage.xml",
             "session.sqlite", "graph.dot", "__pycache__", ".pytest_cache",
             ".ruff_cache", ".slipcover")


def clean_generated(folder: Path) -> None:
    for name in GENERATED:
        for path in folder.rglob(name):
            if path.is_dir():
                shutil.rmtree(path, ignore_errors=True)
            elif path.exists():
                path.unlink()



def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("root")
    parser.add_argument("version")
    parser.add_argument("venv_bin")
    parser.add_argument("--only", action="append", default=[])
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    root = Path(args.root)
    tools = args.only or sorted(CHECKS)
    label = {CLEAN: "CLEAN", FINDINGS: "FINDINGS", NOT_INSTALLED: "NOT INSTALLED"}
    tally = {CLEAN: [], FINDINGS: [], NOT_INSTALLED: []}

    for tool in tools:
        version_root = Path(args.root) / tool / f"py{args.version}"
        try:
            status, detail = run_check_versioned(version_root, tool, args.venv_bin)
        except subprocess.TimeoutExpired:
            status, detail = FINDINGS, "TIMEOUT"
        tally[status].append(tool)
        print(f"{label[status]:>14}  {tool}")
        if args.verbose and status == FINDINGS and detail:
            for line in detail.splitlines()[-14:]:
                print(f"                  | {line}")
        clean_generated(version_root)

    print()
    print(f"py{args.version}: CLEAN {len(tally[CLEAN])}  FINDINGS {len(tally[FINDINGS])}  "
          f"NOT INSTALLED {len(tally[NOT_INSTALLED])}")
    if tally[FINDINGS]:
        print("failing: " + ", ".join(tally[FINDINGS]))
    if tally[NOT_INSTALLED]:
        print("absent:  " + ", ".join(tally[NOT_INSTALLED]))
    return 1 if tally[FINDINGS] else 0


def run_check_versioned(folder: Path, tool: str, venv_bin: str):
    binary, command = CHECKS[tool]
    env = dict(os.environ)
    env["PATH"] = f"{venv_bin}:{env['PATH']}"
    env["SEMGREP_SEND_METRICS"] = "off"
    env["SEMGREP_ENABLE_VERSION_CHECK"] = "0"
    if not shutil.which(binary, path=env["PATH"]):
        return NOT_INSTALLED, f"{binary} not on PATH"
    if not folder.is_dir():
        return NOT_INSTALLED, "folder missing"
    clean_generated(folder)
    env["PYTHONPATH"] = str(folder / "src")
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    env["COLUMNS"] = "100"
    proc = subprocess.run(command, cwd=folder, shell=True, env=env,
                          capture_output=True, text=True, timeout=280)
    output = (proc.stdout + proc.stderr).strip()
    if proc.returncode != 0:
        return FINDINGS, output[-1500:]
    if tool in MUST_BE_SILENT and output:
        return FINDINGS, f"exit 0 but produced output:\n{output[-1200:]}"
    return CLEAN, output[-400:]


if __name__ == "__main__":
    raise SystemExit(main())
