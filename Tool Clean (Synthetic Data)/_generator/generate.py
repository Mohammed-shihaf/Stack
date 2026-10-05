#!/usr/bin/env python3
"""Explode each versionable TypeScript-Tools-Clean tool folder into
node12/node14/node20/node24/node26 subfolders. Domain .ts/.cs source is
copied byte-identical across every family (same invariant as every sibling
corpus); only the build configuration (package.json devDependencies,
tsconfig.json's compile target, and the ESLint-family's config format)
differs per family.
"""
import json
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(__file__))
from pin_table import (
    FAMILIES, TYPESCRIPT, TYPES_NODE, ESLINT_MAJOR, ESLINT_CORE,
    TYPESCRIPT_ESLINT, TS_ESLINT_PARSER_LEGACY, TS_ESLINT_PLUGIN_LEGACY,
    SIMPLE_PINS, NCU_TYPESCRIPT, VITEST_NODE12, VITEST_NODE14_PLAIN,
    VITEST_PLAIN_LATEST, VITE_FOR_PLAIN_VITEST, VITEST_PINNED_BACK, VITEST_COVERAGE_V8_PINNED_BACK,
    VITEST_COVERAGE_ISTANBUL_PINNED_BACK, ENTANGLED_VITEST_TOOLS,
    STRYKER_NODE24_26, STRYKER_NODE20_CORE, UNVERSIONED, NODE_INDEPENDENT,
    ALWAYS_NOT_INSTALLED, NO_FOLDER, ESLINT_FAMILY_TOOLS,
)

ROOT = "/root/ts_work_src"

# node12's V8 (7.8) predates optional-chaining/nullish-coalescing syntax
# support (confirmed live: `a?.b ?? 'x'` is a SyntaxError under this
# session's real node-12.22.12 binary, runs fine under node-14.21.3) --
# every tsconfig.json in this corpus targets ES2022, which does NOT
# down-level those ES2020 operators since they are below the target. Rather
# than rewrite the one domain file that uses them (ts-morph's
# checkResolution.ts), node12's own copy of tsconfig.json lowers `target` to
# ES2019 so tsc down-levels them automatically -- a build-config knob, not a
# source edit, so every family still shares byte-identical .ts source.
TSCONFIG_TARGET_OVERRIDE = {"node12": "ES2019"}

# opentelemetry-sdk-node's own real SDK API genuinely changed shape across
# the major versions this corpus's 5 families resolve to: sdk-trace-node's
# `NodeTracerProvider` only gained its `spanProcessors` constructor option
# in the 2.x line (node20/24/26, pinned 2.11.0), and at node12's own pinned
# 1.3.1, InMemorySpanExporter/SimpleSpanProcessor aren't re-exported from
# sdk-trace-node at all (only sdk-trace-base has them) -- both confirmed
# live. tools/driver.ts (a test harness, not the domain logic under test in
# src/lighthouseRelay.ts) therefore has two real variants, selected per
# family exactly like the ESLint-family's flat-vs-legacy config split.
DRIVER_VARIANTS = {
    "opentelemetry-sdk-node": {
        "legacy": os.path.join(os.path.dirname(__file__), "variants", "otel_driver_legacy.ts"),
        "modern": os.path.join(os.path.dirname(__file__), "variants", "otel_driver_modern.ts"),
    },
}

ESLINT_FLAT_CONFIG_SRC = {
    "ESLint": "eslint.config.js",
    "eslint-plugin-security": "eslint.config.js",
    "eslint-plugin-sonarjs": "eslint.config.js",
}

LEGACY_ESLINTRC = {
    "ESLint": {
        "env": {"node": True, "es2022": True},
        "parser": "@typescript-eslint/parser",
        "parserOptions": {"ecmaVersion": 2022, "sourceType": "module", "project": "./tsconfig.json"},
        "plugins": ["@typescript-eslint"],
        "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
        "rules": {},
    },
    "eslint-plugin-security": {
        "env": {"node": True, "es2022": True},
        "parser": "@typescript-eslint/parser",
        "parserOptions": {"ecmaVersion": 2022, "sourceType": "module", "project": "./tsconfig.json"},
        "plugins": ["@typescript-eslint", "security"],
        "extends": [
            "eslint:recommended",
            "plugin:@typescript-eslint/recommended",
            "plugin:security/recommended-legacy",
        ],
        "rules": {},
    },
    "eslint-plugin-sonarjs": {
        "env": {"node": True, "es2022": True},
        "parser": "@typescript-eslint/parser",
        "parserOptions": {"ecmaVersion": 2022, "sourceType": "module", "project": "./tsconfig.json"},
        "plugins": ["@typescript-eslint", "sonarjs"],
        "extends": [
            "eslint:recommended",
            "plugin:@typescript-eslint/recommended",
            # node12/14 pin eslint-plugin-sonarjs to a pre-4.x release (see
            # pin_table.SIMPLE_PINS) -- those only ever exported a single
            # `recommended` config; the `-legacy`-suffixed name is a 4.x+
            # convention from when the plugin added flat-config support
            # alongside its eslintrc one (confirmed live: 0.15.0/0.23.0's
            # own `configs` export is `{ recommended }`, no `-legacy`).
            "plugin:sonarjs/recommended",
        ],
        "rules": {},
    },
}


def rewrite_tsconfig(tool, family, cfg):
    cfg = json.loads(json.dumps(cfg))
    if "compilerOptions" in cfg:
        target = TSCONFIG_TARGET_OVERRIDE.get(family)
        if target:
            cfg["compilerOptions"]["target"] = target
        # ts-morph 28.0.0 bundles its own TypeScript ~6.0.2 internally and
        # its own .d.ts files (@ts-morph/common) reference `MapIterator`, an
        # Iterator-Helpers-era global type our own much older pinned
        # `typescript` (5.0.4/5.1.6 at node12/14) doesn't declare -- a pure
        # third-party-.d.ts/our-compiler-version mismatch, confirmed live,
        # not anything about our own source. `skipLibCheck` is the standard
        # knob for exactly this (skips type-checking *.d.ts files, never our
        # own src/tools code), applied corpus-wide since it's always safe
        # and only ts-morph's build actually needed it.
        cfg["compilerOptions"]["skipLibCheck"] = True
    return cfg


def rewrite_package_json(tool, family, pkg):
    pkg = json.loads(json.dumps(pkg))
    dd = pkg.get("devDependencies", {})
    unavailable = []

    # typescript + @types/node: corpus-wide ceiling, except npm-check-updates
    # which deliberately tracks latest (see pin_table.NCU_TYPESCRIPT).
    if "typescript" in dd:
        dd["typescript"] = (NCU_TYPESCRIPT[family] if tool == "npm-check-updates"
                             else TYPESCRIPT[family])
    if "@types/node" in dd:
        dd["@types/node"] = TYPES_NODE[family]

    if tool in ESLINT_FAMILY_TOOLS:
        major = ESLINT_MAJOR[family]
        if "eslint" in dd:
            dd["eslint"] = ESLINT_CORE[family]
        if "typescript-eslint" in dd:
            if major >= 9:
                dd["typescript-eslint"] = TYPESCRIPT_ESLINT[family]
            else:
                del dd["typescript-eslint"]
                dd["@typescript-eslint/parser"] = TS_ESLINT_PARSER_LEGACY[family]
                dd["@typescript-eslint/eslint-plugin"] = TS_ESLINT_PLUGIN_LEGACY[family]

    if tool in ENTANGLED_VITEST_TOOLS:
        if family == "node12":
            for pkgname in ("vitest", "@vitest/coverage-v8", "@vitest/coverage-istanbul",
                             "@stryker-mutator/core", "@stryker-mutator/vitest-runner",
                             "@stryker-mutator/typescript-checker"):
                if pkgname in dd:
                    unavailable.append(pkgname)
                    del dd[pkgname]
        elif family == "node14":
            if tool in ("vitest",):
                pass  # unreachable: "vitest" tool itself isn't in ENTANGLED set
            # Entangled tools (StrykerJS/covgate/mewt/oxc-coverage-instrument)
            # have no verified mutually-compatible vitest+runner/coverage
            # trio this old (vitest 0.34.6 predates the entire
            # coverage-v8/coverage-istanbul/vitest-runner package lineage) --
            # left code-only, documented rather than forced; drop the
            # devDependencies so the family folder's package.json doesn't
            # claim a resolvable version that was never actually installed.
            for pkgname in ("vitest", "@vitest/coverage-v8", "@vitest/coverage-istanbul",
                             "@stryker-mutator/core", "@stryker-mutator/vitest-runner",
                             "@stryker-mutator/typescript-checker"):
                if pkgname in dd:
                    unavailable.append(pkgname)
                    del dd[pkgname]
        elif family in ("node24", "node26"):
            if "vitest" in dd:
                dd["vitest"] = VITEST_PINNED_BACK
            if "@vitest/coverage-v8" in dd:
                dd["@vitest/coverage-v8"] = VITEST_COVERAGE_V8_PINNED_BACK
            if "@vitest/coverage-istanbul" in dd:
                dd["@vitest/coverage-istanbul"] = VITEST_COVERAGE_ISTANBUL_PINNED_BACK
            if tool == "StrykerJS":
                dd["@stryker-mutator/core"] = STRYKER_NODE24_26["@stryker-mutator/core"]
                dd["@stryker-mutator/vitest-runner"] = STRYKER_NODE24_26["@stryker-mutator/vitest-runner"]
                dd["@stryker-mutator/typescript-checker"] = STRYKER_NODE24_26["@stryker-mutator/typescript-checker"]
        elif family == "node20":
            if "vitest" in dd:
                dd["vitest"] = VITEST_PINNED_BACK  # provisional; verify_live.py resolves live
            if "@vitest/coverage-v8" in dd:
                dd["@vitest/coverage-v8"] = VITEST_COVERAGE_V8_PINNED_BACK
            if "@vitest/coverage-istanbul" in dd:
                dd["@vitest/coverage-istanbul"] = VITEST_COVERAGE_ISTANBUL_PINNED_BACK
            if tool == "StrykerJS":
                dd["@stryker-mutator/core"] = STRYKER_NODE20_CORE
                dd["@stryker-mutator/vitest-runner"] = STRYKER_NODE20_CORE
                dd["@stryker-mutator/typescript-checker"] = STRYKER_NODE20_CORE
    elif "vitest" in dd:
        # Any other tool that plainly depends on vitest for its own test
        # command (so far: the "vitest" tool's own folder, and fast-check,
        # whose property-based tests run via plain `vitest run` with no
        # coverage provider or Stryker runner involved) gets vitest's own
        # plain-usage ceiling directly, not ENTANGLED_VITEST_TOOLS's
        # coverage/runner-pinned-back version -- generalized from a
        # tool-name check so any current or future plain-vitest-dependent
        # tool is covered automatically, not just the "vitest" folder
        # itself.
        dd["vitest"] = (None if family == "node12" else
                         VITEST_NODE14_PLAIN if family == "node14" else
                         VITEST_PLAIN_LATEST[family])
        if family in ("node20", "node24", "node26"):
            # vitest 5.0.3 (VITEST_PLAIN_LATEST) declares `vite` as a
            # required peerDependency but, unlike the 4.1.11 line pinned
            # back for the coverage/runner-entangled tools, no longer also
            # lists it as a regular dependency -- confirmed live (npm
            # installs it automatically for 4.1.11, not for 5.0.3) -- so it
            # needs an explicit companion pin here or npm simply never
            # installs it and vitest's own CLI crashes at startup
            # (`Cannot find package 'vite'`).
            dd["vite"] = VITE_FOR_PLAIN_VITEST
        if dd["vitest"] is None:
            unavailable.append("vitest")
            del dd["vitest"]

    if tool == "opentelemetry-sdk-node" and family in ("node12", "node14"):
        # node12/14's own driver.ts variant (see DRIVER_VARIANTS) imports
        # InMemorySpanExporter/SimpleSpanProcessor straight from
        # sdk-trace-base, which sdk-trace-node doesn't re-export at these
        # older releases (confirmed live) -- pin it explicitly to the same
        # release line as this family's own sdk-trace-node, its real sibling
        # package in the OpenTelemetry-JS monorepo, rather than leaving it
        # an implicit transitive/hoisted resolution.
        dd["@opentelemetry/sdk-trace-base"] = SIMPLE_PINS["@opentelemetry/sdk-trace-node"][family]

    # simple single/companion-package tools
    for pkgname in list(dd.keys()):
        if pkgname in SIMPLE_PINS:
            pin = SIMPLE_PINS[pkgname].get(family)
            if pin is None:
                unavailable.append(pkgname)
                del dd[pkgname]
            else:
                dd[pkgname] = pin

    pkg["devDependencies"] = dd
    return pkg, unavailable


def process_tool(tool):
    src_dir = os.path.join(ROOT, tool)
    for family in FAMILIES:
        dest_dir = os.path.join(src_dir, family)
        if os.path.isdir(dest_dir):
            shutil.rmtree(dest_dir)
        os.makedirs(dest_dir)

        skip = set(FAMILIES) | {"package.json", "tsconfig.json", "README.md"}
        if tool in ESLINT_FAMILY_TOOLS:
            skip.add("eslint.config.js")
        for entry in sorted(os.listdir(src_dir)):
            if entry in skip:
                continue
            s = os.path.join(src_dir, entry)
            d = os.path.join(dest_dir, entry)
            if os.path.isdir(s):
                shutil.copytree(s, d)
            else:
                shutil.copy2(s, d)

        pkg_path = os.path.join(src_dir, "package.json")
        unavailable = []
        if os.path.isfile(pkg_path):
            with open(pkg_path) as f:
                pkg = json.load(f)
            new_pkg, unavailable = rewrite_package_json(tool, family, pkg)
            with open(os.path.join(dest_dir, "package.json"), "w") as f:
                json.dump(new_pkg, f, indent=2)
                f.write("\n")

        tsconfig_path = os.path.join(src_dir, "tsconfig.json")
        if os.path.isfile(tsconfig_path):
            with open(tsconfig_path) as f:
                tscfg = json.load(f)
            new_tscfg = rewrite_tsconfig(tool, family, tscfg)
            with open(os.path.join(dest_dir, "tsconfig.json"), "w") as f:
                json.dump(new_tscfg, f, indent=2)
                f.write("\n")

        if tool in DRIVER_VARIANTS:
            variant = "legacy" if family in ("node12", "node14") else "modern"
            variant_src = DRIVER_VARIANTS[tool][variant]
            shutil.copy2(variant_src, os.path.join(dest_dir, "tools", "driver.ts"))

        if tool in ESLINT_FAMILY_TOOLS:
            major = ESLINT_MAJOR[family]
            if major >= 9:
                flat_src = os.path.join(src_dir, ESLINT_FLAT_CONFIG_SRC[tool])
                if os.path.isfile(flat_src):
                    shutil.copy2(flat_src, os.path.join(dest_dir, "eslint.config.js"))
            else:
                with open(os.path.join(dest_dir, ".eslintrc.json"), "w") as f:
                    json.dump(LEGACY_ESLINTRC[tool], f, indent=2)
                    f.write("\n")

        if unavailable:
            with open(os.path.join(dest_dir, ".UNAVAILABLE"), "w") as f:
                f.write("\n".join(unavailable) + "\n")

    return True


def main():
    all_tools = sorted(
        d for d in os.listdir(ROOT)
        if os.path.isdir(os.path.join(ROOT, d)) and not d.startswith("_")
    )
    excluded = UNVERSIONED | NODE_INDEPENDENT | ALWAYS_NOT_INSTALLED | NO_FOLDER
    versionable = [t for t in all_tools if t not in excluded]
    node_indep_present = [t for t in all_tools if t in NODE_INDEPENDENT]
    print(f"{len(all_tools)} total tool folders; {len(versionable)} versionable npm "
          f"tools + {len(node_indep_present)} node-independent tools to explode "
          f"({len(UNVERSIONED)} unversioned, {len(ALWAYS_NOT_INSTALLED)} always-blocked, "
          f"{len(NO_FOLDER)} no-folder left untouched)")
    for t in versionable + node_indep_present:
        process_tool(t)
        print(f"  done: {t}")


if __name__ == "__main__":
    main()
