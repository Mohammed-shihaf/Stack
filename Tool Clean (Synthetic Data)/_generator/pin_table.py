"""Per-family pinned versions for TypeScript-Tools-Clean, restricted to the
5 boundary families (node12/14/20/24/26) and the packages this corpus's own
33-tool roster actually uses. Resolved LIVE in this session against the real
npm registry (registry.npmjs.org, fully reachable in this sandbox, unlike the
sibling C#/Java/Python corpora's blocked NuGet/dotnet-CDN/apt registries) --
via each package's real published `engines.node` field across its whole
version history, cross-checked against peerDependencies where a sibling
package's own compatibility range matters (eslint major, vitest major, the
stryker core/runner/checker trio). Mirrors javascript-repos-build-contract.md
and typescript-repos-build-contract.md's own established findings where they
overlap (confirmed independently here, not merely assumed): vitest, knip and
Biome have no Node 12 release; the TypeScript ceiling per family is set by a
tool/ecosystem constraint, never by the runtime itself.

None means a documented, reproducible absence of any resolvable release for
that family -- not a placeholder.
"""

FAMILIES = ["node12", "node14", "node20", "node24", "node26"]

# Real node/npm binaries extracted in this session (actions/node-versions
# GitHub release manifest -- nodejs.org itself is 403 at this sandbox's
# egress proxy, same finding as typescript-repos-build-contract.md).
NODE_BIN = {
    "node12": "/root/ts_work/_toolchains/extracted/node-12.22.12/bin",
    "node14": "/root/ts_work/_toolchains/extracted/node-14.21.3/bin",
    "node20": "/root/ts_work/_toolchains/extracted/node-20.20.2/bin",
    "node24": "/root/ts_work/_toolchains/extracted/node-24.21.0/bin",
    "node26": "/root/ts_work/_toolchains/extracted/node-26.10.0/bin",
}
NODE_VERSION = {
    "node12": "12.22.12", "node14": "14.21.3", "node20": "20.20.2",
    "node24": "24.21.0", "node26": "26.10.0",
}

# TypeScript's own ceiling per family -- established in this project's own
# typescript-repos-build-contract.md / typescript-version-metric-matrix.md
# and reconfirmed live here: node12 is capped by Node itself (TS 5.1+ needs
# >=14.17); node14 by the ecosystem's last TS-5.1-compatible tooling
# generation; node20/24/26 held at 5.9.3 to match this corpus's own existing
# single-version baseline (not auto-upgraded to the newly-released TS 7.0.2,
# whose missing programmatic API breaks every type-aware tool here -- see
# root README "Genuine findings").
TYPESCRIPT = {"node12": "5.0.4", "node14": "5.1.6", "node20": "5.9.3",
              "node24": "5.9.3", "node26": "5.9.3"}

# @types/node tracks the family's own major (semver range so npm resolves
# the newest patch under it); no package has ever gated on this.
TYPES_NODE = {"node12": "^12", "node14": "^14", "node20": "^20",
              "node24": "^24", "node26": "^26"}

# ---------------------------------------------------------------------------
# ESLint family (ESLint, eslint-plugin-security, eslint-plugin-sonarjs): the
# TypeScript-aware parser package itself changed shape at the node16/18
# boundary -- the unified `typescript-eslint` meta-package (import style used
# by this corpus's current baseline) has never published a release for Node
# 12/14 (confirmed live: its own earliest release, 7.0.0, requires Node
# >=16). Node12/14 therefore use the older, separate
# `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` packages
# at 5.62.0 (confirmed live: engines `^12.22.0 || ^14.17.0 || >=16.0.0`,
# matching typescript-version-metric-matrix.md's own documented
# SUPPORTED_TYPESCRIPT_VERSIONS floor for that exact major), with a classic
# .eslintrc.json; node20/24/26 keep this corpus's existing flat-config
# baseline unchanged. eslint-plugin-security and eslint-plugin-sonarjs
# themselves declare either no peer range at all (security) or one spanning
# eslint 8/9/10 simultaneously (sonarjs, confirmed live) -- both stay at
# their single current baseline version across every family, exactly
# matching the sibling JavaScript-Tools-Clean corpus's own
# eslint-plugin-sonarjs treatment (one version, every family).
ESLINT_MAJOR = {"node12": 8, "node14": 8, "node20": 10, "node24": 10, "node26": 10}
ESLINT_CORE = {"node12": "8.57.1", "node14": "8.57.1",
               "node20": "10.11.0", "node24": "10.11.0", "node26": "10.11.0"}
# unified package, node20/24/26 only
TYPESCRIPT_ESLINT = {"node20": "8.71.0", "node24": "8.71.0", "node26": "8.71.0"}
# separate packages, node12/14 only
TS_ESLINT_PARSER_LEGACY = {"node12": "5.62.0", "node14": "5.62.0"}
TS_ESLINT_PLUGIN_LEGACY = {"node12": "5.62.0", "node14": "5.62.0"}

# ---------------------------------------------------------------------------
# vitest: confirmed live that no genuinely intentional Node-12 release
# exists (its own earliest versions predate any `engines` field but are
# non-functional day-one previews, not real releases -- matching this
# project's own typescript-repos-build-contract.md finding "vitest ... have
# no Node 12 release" verbatim). 0.34.6 is vitest's own first release to
# declare an explicit, intentional Node-14 floor (`>=v14.18.0`) and is a
# real, usable release. node20/24/26 keep this corpus's existing baseline
# pins verbatim (already a proven-working combination, built on this
# sandbox's own default Node 22, itself inside the "22/24/26: one toolchain"
# band this project's build-contract doc already established).
VITEST_NODE12 = None
VITEST_NODE14_PLAIN = "0.34.6"  # vitest folder, fast-check: no coverage companion needed
VITEST_PLAIN_LATEST = {"node20": "5.0.3", "node24": "5.0.3", "node26": "5.0.3"}
# vitest 5.0.3 (VITEST_PLAIN_LATEST) only declares `vite` as a required
# peerDependency, not also a regular dependency the way 4.1.11 does
# (confirmed live via the real npm registry) -- so npm never auto-installs
# it and vitest's own CLI crashes at startup (`Cannot find package 'vite'`)
# unless it's pinned explicitly alongside.
VITE_FOR_PLAIN_VITEST = "^7"

# Tools whose vitest usage is more than "vitest run" alone (a matched
# coverage provider, Stryker's vitest-runner, or a downstream coverage-gate
# reader) -- these were already pinned BACK from vitest's current latest at
# this corpus's existing baseline (documented incompatibilities with
# vitest 5.x: "Converting circular structure to JSON" against
# @stryker-mutator/vitest-runner; a matching peer range for
# oxc-coverage-instrument's own istanbul adapter). That baseline combination
# is kept verbatim for node24/26 (>=22, same band as the baseline's own
# Node 22). node14 has no verified mutually-compatible trio this old (vitest
# 0.34.6 predates the entire vitest-runner/coverage-v8/coverage-istanbul
# package lineage, which only begins at vitest's own 0.x "workspace" era
# several minors later) and is left CODE-ONLY, documented rather than
# forced. node20 needs its own fresh resolution (Stryker's core/runner
# packages only reach Node 20 at major 9.x, one major behind the
# node24/26-pinned 10.0.0) -- resolved live in verify_live.py's install
# step itself rather than guessed here.
VITEST_PINNED_BACK = "4.1.11"
VITEST_COVERAGE_V8_PINNED_BACK = "4.1.11"
VITEST_COVERAGE_ISTANBUL_PINNED_BACK = "4.1.11"

ENTANGLED_VITEST_TOOLS = {"StrykerJS", "covgate", "mewt", "oxc-coverage-instrument"}

# ---------------------------------------------------------------------------
# Straightforward single/companion-package tools: newest release whose own
# published `engines.node` is satisfied by the family, confirmed live
# against the real registry (see _generator/resolve.js output, folded in
# here). None means a documented, reproducible absence.
SIMPLE_PINS = {
    "@biomejs/biome": {"node12": None, "node14": "2.5.15", "node20": "2.5.15", "node24": "2.5.15", "node26": "2.5.15"},
    "@cyclonedx/cdxgen": {"node12": "8.6.3", "node14": "8.6.3", "node20": "12.8.5", "node24": "12.8.5", "node26": "12.8.5"},
    "dependency-cruiser": {"node12": "11.18.0", "node14": "12.12.2", "node20": "17.4.3", "node24": "18.5.0", "node26": "18.5.0"},
    "fast-check": {"node12": "4.10.2", "node14": "4.10.2", "node20": "4.10.2", "node24": "4.10.2", "node26": "4.10.2"},
    # jscpd's own version history has a real gap: nothing between 3.2.1
    # (explicit `engines: >=8.9`) and 5.0.4 (`>=18`) ever declares an
    # `engines` field at all, so 4.x looks "unrestricted" to a naive
    # engines-only resolver but isn't -- confirmed live: jscpd 4.3.0's own
    # bundled code throws `Unexpected token '?'` under node12 (undeclared
    # optional-chaining use) and pulls in an ESM-only `commander` transitive
    # dependency that crashes `require()` under node14. jscpd 3.2.1 (pinned
    # to the older, CJS-safe `commander ^4.1.1`) runs cleanly under both,
    # confirmed live.
    "jscpd": {"node12": "3.2.1", "node14": "3.2.1", "node20": "5.4.0", "node24": "5.4.0", "node26": "5.4.0"},
    "knip": {"node12": None, "node14": None, "node20": "6.39.0", "node24": "6.39.0", "node26": "6.39.0"},
    # Same engines-field gap shape as jscpd: nothing between 1.2.2 (no
    # `engines` field) and 2.4.1 (`>=14`) ever declares one, so a naive
    # engines-only resolver picks 2.2.0 as "newest unrestricted" for node12
    # -- confirmed live that 2.2.0's own bundled code throws `Unexpected
    # token '.'` (undeclared optional-chaining use) under node12; 1.2.2 (one
    # minor further back, still no declared floor) runs this folder cleanly
    # (0 production dependencies, so an empty, zero-exit report either way).
    "license-checker-rseidelsohn": {"node12": "1.2.2", "node14": "3.3.0", "node20": "4.4.2", "node24": "5.0.1", "node26": "5.0.1"},
    # Never declares an `engines` field at any release (confirmed live
    # across its full history). Every version old enough to predate its
    # hard `commander@^14` dependency (added partway through the 2.x line)
    # also predates the package shipping an `mcr` CLI at all (confirmed
    # live: 1.0.4-2.1.0 have no `bin` entry); every version from 2.2.0
    # onward that DOES ship `mcr` loads a large bundled vendor file
    # (`lib/packages/monocart-coverage-vendor.js`, a bundled postcss-style
    # pipeline unrelated to this folder's plain v8/json-summary use case)
    # that itself throws `Unexpected token '?'` at require-time under
    # node12 -- confirmed live on both the commander-free 2.2.0 and the
    # current 2.13.0. No version threads both needles, so node12/14 are
    # genuinely unavailable here, not merely unpinned.
    "monocart-coverage-reports": {"node12": None, "node14": None, "node20": "2.13.0", "node24": "2.13.0", "node26": "2.13.0"},
    "oxc-coverage-instrument": {"node12": "0.13.0", "node14": "0.13.0", "node20": "0.13.0", "node24": "0.13.0", "node26": "0.13.0"},
    "oxlint": {"node12": "1.16.0", "node14": "1.16.0", "node20": "1.86.0", "node24": "1.86.0", "node26": "1.86.0"},
    # ts-morph's own bundled runtime (never declares `engines`) picked up
    # progressively newer JS syntax across its major versions -- confirmed
    # live by direct bisection: 19.0.0+ uses undeclared optional chaining in
    # its bundled `@ts-morph/common` TS-checker shim (breaks node12 only,
    # whose V8 predates `?.` support); 21.0.0+ uses private class methods
    # (`#advance()`, breaks node12); 26.0.0+ uses static initialization
    # blocks (breaks node14 too, whose V8 is newer but still predates
    # those). 18.0.0 is the newest release confirmed live to run cleanly on
    # node12; 25.0.1 the newest confirmed live on node14. node20/24/26 keep
    # the existing baseline's 28.0.0 verbatim (already proven there).
    "ts-morph": {"node12": "18.0.0", "node14": "25.0.1", "node20": "28.0.0", "node24": "28.0.0", "node26": "28.0.0"},
    "ts-unused-exports": {"node12": "11.0.1", "node14": "11.0.1", "node20": "11.0.1", "node24": "11.0.1", "node26": "11.0.1"},
    # node12's own pinned sdk-node/sdk-trace-node (0.29.2/1.3.1) both declare
    # a real peer ceiling of `@opentelemetry/api: >=1.0.0 <1.2.0` (confirmed
    # live) -- a full major behind every other family's `<1.10.0` ceiling.
    # Installing the corpus-wide 1.9.1 there anyway (ignoring the peer
    # range) is what produced a real type error, confirmed live: sdk-trace-
    # base@1.3.1's own `Span` class predates api 1.9.1's `addLink`/
    # `addLinks` Span-interface additions, so it "incorrectly implements"
    # the newer interface. 1.1.0 is the newest release inside node12's own
    # real ceiling.
    "@opentelemetry/api": {"node12": "1.1.0", "node14": "1.9.1", "node20": "1.9.1", "node24": "1.9.1", "node26": "1.9.1"},
    "@opentelemetry/sdk-node": {"node12": "0.29.2", "node14": "0.57.2", "node20": "0.222.0", "node24": "0.222.0", "node26": "0.222.0"},
    "@opentelemetry/sdk-trace-node": {"node12": "1.3.1", "node14": "1.30.1", "node20": "2.11.0", "node24": "2.11.0", "node26": "2.11.0"},
    # ncu's whole purpose is "point at latest" -- deliberately NOT held at
    # this corpus's usual TypeScript ceiling (see TYPESCRIPT dict); this is
    # the one folder in the corpus that tracks latest-of-everything per
    # family, matching the existing baseline's own documented rationale.
    "npm-check-updates": {"node12": "12.5.12", "node14": "16.14.20", "node20": "22.2.9", "node24": "23.1.0", "node26": "23.1.0"},
    # eslint-plugin-sonarjs's current baseline (4.2.2, kept for node20/24/26)
    # uses `rule.meta?.docs?.recommended` internally (undeclared optional
    # chaining) and requires Node's `node:path/posix` built-in (16+) --
    # confirmed live to crash node12 and node14 respectively. 0.15.0
    # (engines `>=12`) and 0.23.0 (engines `>=14`) are the newest releases
    # whose own bundled code actually runs on each, confirmed live; both
    # only ever exported a plain `recommended` config (see generate.py's
    # LEGACY_ESLINTRC for the matching `.eslintrc.json` extends entry).
    "eslint-plugin-sonarjs": {"node12": "0.15.0", "node14": "0.23.0", "node20": "4.2.2", "node24": "4.2.2", "node26": "4.2.2"},
}
NCU_TYPESCRIPT = {"node12": "5.0.4", "node14": "6.0.3", "node20": "7.0.2", "node24": "7.0.2", "node26": "7.0.2"}

# ---------------------------------------------------------------------------
# StrykerJS: the one tool in this corpus whose own ecosystem trio
# (core/runner/checker) genuinely does not resolve uniformly across all 5
# families -- mirrors this corpus family's established pattern of one
# "genuinely family-dependent" tool per language (Roslyn for C#, StrykerJS
# already for the sibling JavaScript-Tools-Clean). node24/26 keep the
# existing baseline trio verbatim (already >=22-gated, proven). node20 is
# resolved live in verify_live.py itself (its own core/runner/checker ceiling
# is 9.6.1, one major behind the node24/26-pinned 10.0.0, and the matching
# vitest peer range is determined by the real install's own error output,
# not guessed here).
STRYKER_NODE24_26 = {
    "@stryker-mutator/core": "10.0.0",
    "@stryker-mutator/vitest-runner": "10.0.0",
    "@stryker-mutator/typescript-checker": "10.0.0",
    "vitest": VITEST_PINNED_BACK,
    "@vitest/coverage-v8": VITEST_COVERAGE_V8_PINNED_BACK,
}
STRYKER_NODE20_CORE = "9.6.1"  # runner/checker/vitest resolved live

# Tools that stay single-version / unversioned (git-history miners, matching
# the exact precedent already established for the sibling Python/JS/Java/C#
# corpora)
UNVERSIONED = {"diff-cover", "pydriller"}

# Tools whose own real tool/binary has zero Node-runtime footprint at all --
# content copied unchanged into each family folder and genuinely re-invoked
# for real per family (same rigor as the C# corpus's TFM_BLIND_LIVE set, one
# notch more thorough than the sibling JS corpus's "assumed same" shortcut
# for this class of tool).
NODE_INDEPENDENT = {"cccc", "Lizard", "debtmap", "Opengrep"}

# Blocked regardless of family -- same underlying reason (GitHub Releases
# 403, golang proxy not allowlisted, no live Sonar server, or a genuine
# roster-category defect) on every Node version, so the single-version
# baseline's own finding is carried forward unchanged.
ALWAYS_NOT_INSTALLED = {"CVE Lite CLI", "Grype", "OSV-Scanner", "SonarJS", "Bearer CLI"}

# Genuine roster/category defect -- no real tool, no folder contents at all.
NO_FOLDER = {"red-dragon"}

VERSIONABLE_VITEST_DEPENDENT = {"vitest", "fast-check", "StrykerJS", "covgate", "mewt", "oxc-coverage-instrument"}
ESLINT_FAMILY_TOOLS = {"ESLint", "eslint-plugin-security", "eslint-plugin-sonarjs"}
