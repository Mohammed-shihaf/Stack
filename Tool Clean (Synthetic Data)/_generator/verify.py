#!/usr/bin/env python3
"""Run every tool (or its documented real stand-in) for real against its
folder and tally CLEAN / FINDINGS / NOT_INSTALLED.

Exit-code vocabulary, kept deliberately apart, matching the sibling
Python/JavaScript/Java corpora: 0 clean, 1 findings, 4 not installed on
this host. A missing binary must never masquerade as a clean scan.
"""
import argparse
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from meta import TOOLS  # noqa: E402

CLEAN, FINDINGS, NOT_INSTALLED = 0, 1, 4

GENERATED = [
    "build", "coverage", "coverage-report", ".stryker-tmp", "reports",
    "bom.json", "bom.xml", "mewt.sqlite", ".cccc", "cve-report",
]


def run(cmd, cwd, check=False, timeout=180):
    result = subprocess.run(
        cmd, cwd=cwd, shell=isinstance(cmd, str),
        capture_output=True, text=True, timeout=timeout,
    )
    if check and result.returncode != 0:
        raise RuntimeError(f"{cmd} failed:\n{result.stdout}\n{result.stderr}")
    return result.returncode, result.stdout + result.stderr


def clean_generated(folder: Path):
    for name in GENERATED:
        p = folder / name
        if p.is_dir():
            shutil.rmtree(p, ignore_errors=True)
        elif p.is_file():
            p.unlink(missing_ok=True)


def npm_install(folder, legacy=False):
    cmd = ["npm", "install", "--no-audit", "--no-fund"]
    if legacy:
        cmd.append("--legacy-peer-deps")
    rc, out = run(cmd, folder, timeout=300)
    return rc == 0, out


# ---- individual checks -----------------------------------------------

def check_biome(folder, verbose):
    rc, out = run(["npx", "biome", "check", "src/"], folder)
    return (CLEAN if rc == 0 else FINDINGS), out


def check_eslint(folder, verbose):
    rc, out = run(["npx", "eslint", "src/"], folder)
    return (CLEAN if rc == 0 else FINDINGS), out


def check_oxlint(folder, verbose):
    rc, out = run(["npx", "oxlint", "src/"], folder)
    return (CLEAN if rc == 0 else FINDINGS), out


def check_lizard(folder, verbose):
    rc, out = run(
        ["lizard", "--languages", "typescript", "src/", "-C", "10", "-L", "60", "-a", "5", "-w"],
        folder,
    )
    clean = rc == 0 and out.strip() == ""
    return (CLEAN if clean else FINDINGS), out


def check_knip(folder, verbose):
    rc, out = run(["npx", "knip"], folder)
    return (CLEAN if rc == 0 else FINDINGS), out


def check_ts_unused_exports(folder, verbose):
    rc, out = run(["npx", "ts-unused-exports", "tsconfig.json"], folder)
    clean = "0 modules with unused exports" in out
    return (CLEAN if clean else FINDINGS), out


def check_dependency_cruiser(folder, verbose):
    rc, out = run(
        ["npx", "depcruise", "src", "--config", ".dependency-cruiser.cjs", "--output-type", "err"],
        folder,
    )
    return (CLEAN if rc == 0 else FINDINGS), out


def check_ts_morph(folder, verbose):
    rc, out = run(["npx", "tsc"], folder, check=True)
    rc, out = run(["node", "build/tools/checkResolution.js"], folder)
    clean = rc == 0 and "DIAGNOSTICS=0 UNRESOLVED_IDENTIFIERS=0" in out
    return (CLEAN if clean else FINDINGS), out


def check_vitest(folder, verbose):
    rc, out = run(["npx", "vitest", "run"], folder)
    return (CLEAN if rc == 0 else FINDINGS), out


def check_fast_check(folder, verbose):
    rc, out = run(["npx", "vitest", "run"], folder)
    return (CLEAN if rc == 0 else FINDINGS), out


def check_monocart(folder, verbose):
    rc, out = run(["npx", "tsc"], folder, check=True)
    rc, out = run(
        ["npx", "mcr", "--filter", "**/build/src/**", "node", "build/tools/driver.js",
         "-r", "v8,json-summary", "-o", "coverage-report"],
        folder,
    )
    summary_path = folder / "coverage-report" / "coverage-summary.json"
    clean = False
    if rc == 0 and summary_path.exists():
        import json
        data = json.loads(summary_path.read_text())
        total = data["total"]
        clean = all(
            total[k]["pct"] == 100
            for k in ("lines", "statements", "functions", "branches")
        )
    return (CLEAN if clean else FINDINGS), out


def check_stryker(folder, verbose):
    rc, out = run(["npx", "stryker", "run"], folder, timeout=120)
    clean = rc == 0 and "Final mutation score of 100.00" in out
    return (CLEAN if clean else FINDINGS), out


def check_jscpd(folder, verbose):
    rc, out = run(
        ["npx", "jscpd", "src/", "--min-lines", "5", "--min-tokens", "30", "--threshold", "0"],
        folder,
    )
    return (CLEAN if rc == 0 else FINDINGS), out


def check_cdxgen(folder, verbose):
    rc, out = run(["npx", "cdxgen", "-t", "js", "-o", "bom.json", "."], folder, timeout=120)
    clean = rc == 0 and (folder / "bom.json").exists()
    return (CLEAN if clean else FINDINGS), out


def check_npm_check_updates(folder, verbose):
    rc, out = run(["npx", "ncu"], folder)
    clean = "All dependencies match the latest package versions" in out
    return (CLEAN if clean else FINDINGS), out


def check_license_checker(folder, verbose):
    rc, out = run(
        ["npx", "license-checker-rseidelsohn", "--production",
         "--onlyAllow", "MIT;ISC;BSD-2-Clause;BSD-3-Clause;Apache-2.0;0BSD",
         "--excludePrivatePackages"],
        folder,
    )
    return (CLEAN if rc == 0 else FINDINGS), out


def check_oxc_coverage_instrument(folder, verbose):
    rc, out = run(["npx", "vitest", "run", "--coverage"], folder)
    clean = rc == 0 and "Statements   : 100%" in out
    return (CLEAN if clean else FINDINGS), out


def check_opentelemetry(folder, verbose):
    rc, out = run(["npx", "tsc"], folder, check=True)
    rc, out = run(["node", "build/tools/driver.js"], folder)
    clean = rc == 0 and "SPANS_EMITTED=1 ATTRS_OK=true" in out
    return (CLEAN if clean else FINDINGS), out


def check_pydriller(folder, verbose):
    script = (
        "from pydriller import Repository\n"
        "commits = list(Repository('.').traverse_commits())\n"
        "authors = sorted({c.author.name for c in commits})\n"
        "print('COMMITS=%d AUTHORS=%s' % (len(commits), authors))\n"
    )
    rc, out = run(["python3", "-c", script], folder)
    expected_authors = "['Ada Renwick', 'Mikkel Aas', 'Priya Nallan']"
    clean = "COMMITS=4" in out and expected_authors in out
    return (CLEAN if clean else FINDINGS), out


def check_diff_cover(folder, verbose):
    branch_rc, branch = run(["git", "rev-parse", "--abbrev-ref", "HEAD"], folder)
    if branch.strip() != "feature":
        run(["git", "checkout", "feature"], folder)
    rc, out = run(["npx", "vitest", "run", "--coverage"], folder)
    if rc != 0:
        return FINDINGS, out
    rc, out = run(["diff-cover", "coverage/cobertura-coverage.xml", "--compare-branch", "main"], folder)
    clean = "Coverage: 100%" in out
    return (CLEAN if clean else FINDINGS), out


def check_covgate(folder, verbose):
    branch_rc, branch = run(["git", "rev-parse", "--abbrev-ref", "HEAD"], folder)
    if branch.strip() != "feature":
        run(["git", "checkout", "feature"], folder)
    rc, out = run(["npx", "vitest", "run", "--coverage"], folder)
    if rc != 0:
        return FINDINGS, out
    rc, out = run(
        ["covgate", "check", "coverage/coverage-final.json", "--base", "main", "--no-github-summary"],
        folder,
    )
    clean = rc == 0 and out.count("PASS") >= 3
    return (CLEAN if clean else FINDINGS), out


def check_debtmap(folder, verbose):
    rc, out = run(["debtmap", "analyze", "src", "--languages", "typescript", "--plain"], folder, timeout=60)
    clean = rc == 0 and ("No technical debt items found" in out or "TOTAL DEBT SCORE: 0" in out)
    return (CLEAN if clean else FINDINGS), out


def check_mewt(folder, verbose):
    (folder / "mewt.sqlite").unlink(missing_ok=True)
    rc, out = run(["mewt", "run", "src", "--comprehensive"], folder, timeout=120)
    clean = rc == 0 and "Uncaught: 0 mutants" in out
    return (CLEAN if clean else FINDINGS), out


def check_cccc(folder, verbose):
    (folder / ".cccc").mkdir(exist_ok=True)
    rc, out = run(["cccc", "src/boiler_room.c"], folder)
    rc2, out2 = run(["python3", "check_cccc.py"], folder)
    clean = rc2 == 0
    return (CLEAN if clean else FINDINGS), out + out2


def check_eslint_plugin_security(folder, verbose):
    return check_eslint(folder, verbose)


def check_eslint_plugin_sonarjs(folder, verbose):
    return check_eslint(folder, verbose)


def check_opengrep(folder, verbose):
    rc, out = run(
        ["semgrep", "--metrics=off", "--disable-version-check", "--config", "security-rules.yml", "src/"],
        folder,
    )
    clean = rc == 0 and "0 findings" in out
    return (CLEAN if clean else FINDINGS), out


def check_not_installed(folder, verbose):
    return NOT_INSTALLED, "genuinely not installable/reachable in this sandbox -- see README"


CHECKS = {
    "Biome": check_biome,
    "CVE Lite CLI": check_not_installed,
    "ESLint": check_eslint,
    "Grype": check_not_installed,
    "Lizard": check_lizard,
    "OSV-Scanner": check_not_installed,
    "Opengrep": check_opengrep,
    "SonarJS": check_not_installed,
    "StrykerJS": check_stryker,
    "cccc": check_cccc,
    "cdxgen": check_cdxgen,
    "covgate": check_covgate,
    "debtmap": check_debtmap,
    "dependency-cruiser": check_dependency_cruiser,
    "diff-cover": check_diff_cover,
    "eslint-plugin-security": check_eslint_plugin_security,
    "eslint-plugin-sonarjs": check_eslint_plugin_sonarjs,
    "fast-check": check_fast_check,
    "jscpd": check_jscpd,
    "knip": check_knip,
    "license-checker-rseidelsohn": check_license_checker,
    "mewt": check_mewt,
    "monocart-coverage-reports": check_monocart,
    "npm-check-updates": check_npm_check_updates,
    "opentelemetry-sdk-node": check_opentelemetry,
    "oxc-coverage-instrument": check_oxc_coverage_instrument,
    "oxlint": check_oxlint,
    "pydriller": check_pydriller,
    "ts-morph": check_ts_morph,
    "ts-unused-exports": check_ts_unused_exports,
    "vitest": check_vitest,
    "Bearer CLI": check_not_installed,
    "red-dragon": check_not_installed,
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root")
    parser.add_argument("--only")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    root = Path(args.root)
    tools = TOOLS if not args.only else [t for t in TOOLS if t["tool"] == args.only]

    tally = {CLEAN: 0, FINDINGS: 0, NOT_INSTALLED: 0}
    for entry in tools:
        name = entry["tool"]
        folder = root / name
        check = CHECKS[name]
        try:
            code, detail = check(folder, args.verbose)
        except Exception as exc:  # noqa: BLE001
            code, detail = FINDINGS, f"exception: {exc}"
        finally:
            clean_generated(folder)

        tally[code] += 1
        label = {CLEAN: "CLEAN", FINDINGS: "FINDINGS", NOT_INSTALLED: "NOT_INSTALLED"}[code]
        print(f"{name}: {label}")
        if args.verbose or code == FINDINGS:
            print(detail)

    print()
    print(f"CLEAN={tally[CLEAN]} FINDINGS={tally[FINDINGS]} NOT_INSTALLED={tally[NOT_INSTALLED]}")
    return 1 if tally[FINDINGS] else 0


if __name__ == "__main__":
    raise SystemExit(main())
