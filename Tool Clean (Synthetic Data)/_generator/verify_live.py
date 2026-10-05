#!/usr/bin/env python3
"""Real per-family live verification for TypeScript-Tools-Clean.

For each versionable live npm tool, under each family's own real Node+npm
binary (pin_table.NODE_BIN), do a real `npm install` (retrying once with
--legacy-peer-deps on failure, matching the sibling JS corpus's own
established precedent for npm's arborist peer-resolution quirks), build via
`npx tsc` first where the tool's verification needs compiled build/*.js
(ts-morph, opentelemetry-sdk-node, monocart-coverage-reports), then run the
tool's real verification command exactly as documented in the baseline
corpus's own meta.py.

The four node-independent tools (Lizard, Opengrep, cccc, debtmap) need no
npm install at all -- they are still genuinely re-invoked for real in every
family folder (more rigorous than the JS sibling corpus's "assume same
status, don't re-run" shortcut for this class, matching this corpus's own
TFM_BLIND_LIVE-style precedent from the C# corpus instead).

Any family whose generate.py run wrote a `.UNAVAILABLE` marker (the tool's
own package, or a hard-required companion like vitest, was genuinely
unresolvable for that family -- see generate.py/pin_table.py for the
specific reasons) is skipped here rather than attempted: running the
command anyway would let `npx` silently fall through to fetching an
unpinned, un-vetted version live off the registry and report a false
"clean" result for a family that was never really measured (caught live:
Biome/node12 initially reported OK this way before `--no-install` and this
skip were added). That silent-fetch risk is why every `npx` invocation
below also passes `--no-install`, as defense in depth.

ESLint 8.57.1 (node12/14's pinned major) auto-detects a flat eslint.config.js
anywhere up the directory tree from cwd unless ESLINT_USE_FLAT_CONFIG=false
is set explicitly -- caught live: ESLint/node12 was loading the tool root's
own eslint.config.js (which `require`s the node20+-only `typescript-eslint`
package) instead of the family folder's own .eslintrc.json, crashing before
it ever linted anything. Fixed by pinning ESLINT_USE_FLAT_CONFIG explicitly
per family (false for the two legacy-config families, true for the three
flat-config families) rather than relying on auto-detection.
"""
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
from pin_table import FAMILIES, NODE_BIN, ESLINT_FAMILY_TOOLS

ROOT = "/root/ts_work_src"

BUILD_FIRST = {"ts-morph", "opentelemetry-sdk-node", "monocart-coverage-reports"}

# Real verification commands, taken directly from the baseline corpus's own
# meta.py "command" field (built binaries referenced relative to each
# family folder's own build/ output; node_modules/.bin tools invoked via
# `npx --no-install` so they resolve strictly to that family's own
# installed version, or fail loudly, rather than silently fetching an
# unpinned replacement from the registry).
COMMANDS = {
    "Biome": "npx --no-install biome check src/",
    "ESLint": "npx --no-install eslint src/",
    "StrykerJS": "npx --no-install stryker run",
    "cdxgen": "npx --no-install cdxgen -t js -o bom.json .",
    "covgate": "npx --no-install vitest run --coverage && covgate check coverage/coverage-final.json --base main",
    "dependency-cruiser": "npx --no-install depcruise src --config .dependency-cruiser.cjs --output-type err",
    "eslint-plugin-security": "npx --no-install eslint src/",
    "eslint-plugin-sonarjs": "npx --no-install eslint src/",
    "fast-check": "npx --no-install vitest run",
    "jscpd": "npx --no-install jscpd src/ --min-lines 5 --min-tokens 30 --threshold 0",
    "knip": "npx --no-install knip",
    "license-checker-rseidelsohn": (
        'npx --no-install license-checker-rseidelsohn --production '
        '--onlyAllow "MIT;ISC;BSD-2-Clause;BSD-3-Clause;Apache-2.0;0BSD" '
        '--excludePrivatePackages'
    ),
    "mewt": "mewt run src --comprehensive",
    "monocart-coverage-reports": (
        'npx --no-install mcr --filter "**/build/src/**" node build/tools/driver.js '
        '-r v8,json-summary -o coverage-report'
    ),
    "npm-check-updates": "npx --no-install ncu",
    "opentelemetry-sdk-node": "node build/tools/driver.js",
    "oxc-coverage-instrument": "npx --no-install vitest run --coverage",
    "oxlint": "npx --no-install oxlint src/",
    "ts-morph": "node build/tools/checkResolution.js",
    "ts-unused-exports": "npx --no-install ts-unused-exports tsconfig.json",
    "vitest": "npx --no-install vitest run",
}

# Node-independent tools: real binaries already on PATH (lizard/semgrep via
# pip, cccc via apt), genuinely re-run per family even though the result
# cannot differ by Node version.
NODE_INDEP_COMMANDS = {
    "Lizard": "lizard --languages typescript src/ -C 10 -L 60 -a 5 -w",
    "Opengrep": "semgrep --config security-rules.yml src/ --error",
    "cccc": "cccc src/boiler_room.c && python3 check_cccc.py",
    "debtmap": "debtmap analyze src --languages typescript",
}


def run(cmd, cwd, env, timeout=240):
    return subprocess.run(
        cmd, cwd=cwd, env=env, capture_output=True, text=True,
        timeout=timeout, shell=True, executable="/bin/bash",
    )


def npm_install(folder, env):
    r = run("npm install --no-audit --no-fund", folder, env, timeout=300)
    if r.returncode == 0:
        return r, "plain"
    r2 = run("npm install --no-audit --no-fund --legacy-peer-deps", folder, env, timeout=300)
    if r2.returncode == 0:
        return r2, "legacy-peer-deps"
    # A handful of old native-addon postinstall scripts (leveldown under
    # npm 6, protobufjs's own postinstall codegen) fail in this sandbox
    # under the legacy node12/14 toolchains even though the package itself
    # isn't needed at the native-binding level for this folder's plain CLI
    # usage (confirmed live for jscpd/leveldown and opentelemetry-sdk-node/
    # protobufjs) -- --ignore-scripts is a real, reasoned fallback here, not
    # a blanket workaround: it is only reached after both prior attempts
    # already failed.
    r3 = run("npm install --no-audit --no-fund --ignore-scripts", folder, env, timeout=300)
    return r3, "ignore-scripts"


def main():
    results = {}

    for tool, cmd in NODE_INDEP_COMMANDS.items():
        results[tool] = {}
        for family in FAMILIES:
            folder = os.path.join(ROOT, tool, family)
            if not os.path.isdir(folder):
                results[tool][family] = {"error": "folder missing"}
                continue
            env = dict(os.environ)
            r = run(cmd, folder, env, timeout=120)
            results[tool][family] = {
                "run_rc": r.returncode,
                "run_tail": (r.stdout[-2000:] + r.stderr[-2000:]),
            }
            print(f"[{tool}/{family}] {'OK' if r.returncode == 0 else f'FAIL rc={r.returncode}'}")

    for tool, cmd in COMMANDS.items():
        results[tool] = {}
        for family in FAMILIES:
            folder = os.path.join(ROOT, tool, family)
            if not os.path.isdir(folder):
                results[tool][family] = {"error": "folder missing"}
                continue

            unavailable_marker = os.path.join(folder, ".UNAVAILABLE")
            if os.path.isfile(unavailable_marker):
                with open(unavailable_marker) as f:
                    dropped = f.read().strip()
                results[tool][family] = {
                    "skipped": "generate.py dropped a required package for this family",
                    "unavailable": dropped,
                }
                print(f"[{tool}/{family}] SKIPPED (unavailable: {dropped!r})")
                continue

            bindir = NODE_BIN[family]
            env = dict(os.environ)
            env["PATH"] = bindir + ":" + env["PATH"]
            if tool in ESLINT_FAMILY_TOOLS:
                env["ESLINT_USE_FLAT_CONFIG"] = "false" if family in ("node12", "node14") else "true"
            entry = {}

            install_r, install_strategy = npm_install(folder, env)
            entry["install_rc"] = install_r.returncode
            entry["install_strategy"] = install_strategy
            if install_r.returncode != 0:
                entry["install_tail"] = install_r.stdout[-1500:] + install_r.stderr[-1500:]
                results[tool][family] = entry
                print(f"[{tool}/{family}] INSTALL FAILED rc={install_r.returncode}")
                continue

            if tool in BUILD_FIRST:
                build_r = run("npx --no-install tsc", folder, env, timeout=120)
                entry["build_rc"] = build_r.returncode
                if build_r.returncode != 0:
                    entry["build_tail"] = build_r.stdout[-1500:] + build_r.stderr[-1500:]
                    results[tool][family] = entry
                    print(f"[{tool}/{family}] BUILD FAILED rc={build_r.returncode}")
                    continue

            run_r = run(cmd, folder, env, timeout=240)
            entry["run_rc"] = run_r.returncode
            entry["run_tail"] = run_r.stdout[-2000:] + run_r.stderr[-2000:]
            results[tool][family] = entry
            print(f"[{tool}/{family}] {'OK' if run_r.returncode == 0 else f'FAIL rc={run_r.returncode}'}")

    with open(os.path.join(ROOT, "live_results.json"), "w") as f:
        json.dump(results, f, indent=2)
    print("\nDone. See live_results.json")


if __name__ == "__main__":
    main()
