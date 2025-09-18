#!/usr/bin/env python3
"""Banner / --verify / --run for the tool roster.

--run distinguishes a skip that dataset.json ALREADY RECORDS (the measurement,
exit 0) from a skip it does not (a new finding, exit 2).
"""
import argparse, json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAMES = {0: "ran", 1: "FAILED", 3: "skipped", 4: "not installed"}


def dataset():
    with open(os.path.join(ROOT, "dataset.json")) as fh:
        return json.load(fh)


def banner(ds):
    print("OrderKit - %s (%s), C# %s" % (ds["netLabel"], ds["targetFramework"],
                                         ds["languageVersion"]))
    print("branch %s  cell %s/%s/%s" % (ds["branch"], ds["cell"]["bundler"],
                                        ds["cell"]["packageManager"],
                                        ds["cell"]["architecture"]))
    print("%d tools declared, %d expected to fire"
          % (ds["expectations"]["toolsTotal"], ds["expectations"]["toolsActive"]))


def verify(ds):
    problems = []
    for t in ds["tools"]:
        run = os.path.join(ROOT, "tools", t["slug"], "run.sh")
        if not os.path.exists(run):
            problems.append("%s: no runner" % t["slug"])
        elif not os.access(run, os.X_OK):
            problems.append("%s: runner not executable" % t["slug"])
    if problems:
        print("VERIFY FAILED")
        for p in problems:
            print("  -", p)
        return 1
    print("OK - %d runners present and executable" % len(ds["tools"]))
    return 0


def run(ds):
    expected = {t["slug"]: t["expectedExitCode"] for t in ds["tools"]}
    surprises, tally = [], {}
    for t in ds["tools"]:
        run_sh = os.path.join(ROOT, "tools", t["slug"], "run.sh")
        proc = subprocess.run(["bash", run_sh], capture_output=True, text=True,
                              env=dict(os.environ, REPO_ROOT=ROOT))
        rc = proc.returncode
        tally[rc] = tally.get(rc, 0) + 1
        mark = "ok " if rc == expected[t["slug"]] else "NEW"
        if rc != expected[t["slug"]]:
            surprises.append("%s: expected %d (%s), got %d (%s)"
                             % (t["slug"], expected[t["slug"]],
                                NAMES.get(expected[t["slug"]], "?"), rc,
                                NAMES.get(rc, "?")))
        print("  %s %-18s %d %s" % (mark, t["slug"], rc, NAMES.get(rc, "?")))
    print("\n" + ", ".join("%d %s" % (n, NAMES.get(rc, str(rc)))
                           for rc, n in sorted(tally.items())))
    if surprises:
        print("\nUNRECORDED RESULTS - these are new findings, not measurements:")
        for s in surprises:
            print("  -", s)
        return 2
    print("every result matches dataset.json")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--verify", action="store_true")
    ap.add_argument("--run", action="store_true")
    a = ap.parse_args()
    d = dataset()
    if a.verify:
        sys.exit(verify(d))
    if a.run:
        banner(d); print(); sys.exit(run(d))
    banner(d)
