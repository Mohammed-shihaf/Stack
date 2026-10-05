#!/usr/bin/env python3
"""Single source-of-truth tool roster for TypeScript-Tools-Clean.

Each entry mirrors the harvested `TypeScript Tools` folder name exactly.
`status` is "measured" (actually installed/built and invoked for real in
this sandbox) or "not_installed" (genuinely unreachable here, or the
folder's real function cannot be exercised for a documented, verified
reason).

`standin` names a real, already-installed tool that was run for real in
that folder as an honest substitute when one made sense (never silently
presented as the named tool).
"""

TOOLS = [
    {
        "tool": "Biome",
        "package": "@biomejs/biome 2.5.14 (npm)",
        "status": "measured",
        "standin": None,
        "domain": "ferry crossing schedule (FerrySchedule)",
        "clean_means": (
            "`biome check` (own Rust parser, no tsc involved) reports zero "
            "linter and zero formatter findings against FerrySchedule."
        ),
        "command": "biome check src/",
        "notes": None,
    },
    {
        "tool": "CVE Lite CLI",
        "package": "cve-lite-cli 1.37.0 (npm, OWASP project)",
        "status": "not_installed",
        "standin": None,
        "domain": "granary dependency inventory (GranaryInventory)",
        "clean_means": (
            "cve-lite would parse package-lock.json, batch-query the OSV "
            "database for every resolved package, and report zero known "
            "vulnerabilities."
        ),
        "command": "cve-lite . --no-open",
        "notes": (
            "cve-lite-cli itself installs and runs fine (real npm package, "
            "matches its GitHub description exactly), but its only vulnerability "
            "source is `api.osv.dev`, which returns 403 at this sandbox's egress "
            "proxy (measured directly, not assumed). Its `--offline` mode only "
            "reads a local advisory database that itself must be populated by "
            "`cve-lite advisories sync` against that same blocked endpoint -- "
            "running `--offline` against the empty database `advisories init` "
            "creates does report \"no known vulnerabilities\", but that is "
            "vacuously true (zero advisories to match against), not a real "
            "measurement, so it is not counted as a clean result here."
        ),
    },
    {
        "tool": "ESLint",
        "package": "eslint 10.11.0 + typescript-eslint 8.71.0 (npm)",
        "status": "measured",
        "standin": None,
        "domain": "lighthouse beacon flash timing (BeaconSignal)",
        "clean_means": (
            "`eslint src/` under typescript-eslint's recommended type-aware "
            "config reports zero errors and zero warnings against BeaconSignal."
        ),
        "command": "eslint src/",
        "notes": None,
    },
    {
        "tool": "Grype",
        "package": "github.com/anchore/grype (Go binary / GitHub release)",
        "status": "not_installed",
        "standin": None,
        "domain": "ship chandlery stock pins (ChandleryStock)",
        "clean_means": (
            "A Grype SBOM scan of ChandleryStock's pinned dependencies would "
            "report zero known-vulnerable packages."
        ),
        "command": "grype dir:. -o table",
        "notes": (
            "Grype ships only as a GitHub Release binary or via `go install`; "
            "both are blocked here (GitHub Releases: 403 at the egress proxy; "
            "`go install github.com/anchore/grype@latest`: \"Host not in "
            "allowlist: proxy.golang.org\", measured directly). No apt package "
            "exists. Same finding as the sibling Java corpus."
        ),
    },
    {
        "tool": "Lizard",
        "package": "lizard 1.24.0 (PyPI)",
        "status": "measured",
        "standin": None,
        "domain": "vineyard terrace yield estimation (vineyardTerrace)",
        "clean_means": (
            "`lizard --languages typescript` reports every function under its "
            "cyclomatic-complexity (10) and length (60) thresholds -- zero "
            "warnings."
        ),
        "command": "lizard --languages typescript src/ -C 10 -L 60 -a 5 -w",
        "notes": (
            "Same cross-language, own-tokeniser package already used in the "
            "sibling Python/JavaScript/Java corpora; per the project's own "
            "typescript-version-metric-matrix.md, Lizard never loads tsc so it "
            "is version-blind to the TypeScript compiler entirely (Class B)."
        ),
    },
    {
        "tool": "OSV-Scanner",
        "package": "github.com/google/osv-scanner (Go binary / GitHub release)",
        "status": "not_installed",
        "standin": None,
        "domain": "cordwood stack inventory (CordwoodStack)",
        "clean_means": (
            "An OSV-Scanner run against CordwoodStack's lockfile would report "
            "zero known-vulnerable packages."
        ),
        "command": "osv-scanner --lockfile package-lock.json",
        "notes": (
            "Same shape of blocker as Grype: GitHub Releases return 403 here "
            "and `go install github.com/google/osv-scanner/cmd/osv-scanner@latest` "
            "is refused by the same golang proxy allowlist. No apt package "
            "exists."
        ),
    },
    {
        "tool": "Opengrep",
        "package": "opengrep/opengrep (Go binary / GitHub release)",
        "status": "measured",
        "standin": "semgrep",
        "domain": "relay signal lockbox access control (SignalLockbox)",
        "clean_means": (
            "Opengrep is a semgrep fork sharing its rule format; not reachable "
            "here (see notes), so `semgrep` -- already installed, and used the "
            "same way as this corpus's own FindSecBugs-equivalent stand-in in "
            "the sibling Java corpus -- was run for real against a local custom "
            "ruleset (hardcoded secrets, weak hashes, insecure randomness, "
            "non-constant-time comparison) and found zero findings."
        ),
        "command": "semgrep --config security-rules.yml src/",
        "notes": (
            "The npm package literally named `opengrep` is a 145-byte parked "
            "placeholder (not the real tool); Opengrep's real distribution is a "
            "GitHub Release binary, blocked here (403), with no apt/go-install "
            "route either (same golang proxy block as Grype/OSV-Scanner)."
        ),
    },
    {
        "tool": "SonarJS",
        "package": "org.sonarsource.javascript:sonar-javascript-plugin (SonarQube/SonarCloud plugin)",
        "status": "not_installed",
        "standin": None,
        "domain": "harbor berth assignment planning (HarborBerthPlan)",
        "clean_means": (
            "SonarJS's rule engine, run inside a SonarQube/SonarCloud analysis, "
            "would report zero code-smell/bug findings against HarborBerthPlan."
        ),
        "command": "sonar-scanner -Dsonar.host.url=<server>",
        "notes": (
            "SonarJS is the analyzer engine embedded in SonarQube/SonarCloud, "
            "not a standalone CLI -- there is no live Sonar server reachable "
            "from this sandbox to submit an analysis to. The npm package "
            "literally named `sonarjs` is real (published by SonarSource) but "
            "is `sonarjs-cli`, explicitly marked DEPRECATED on npm and itself "
            "only a thin uploader client for a Sonar server, not a local "
            "analyzer -- installing it would not change this. (The separate, "
            "already-measured `eslint-plugin-sonarjs` folder exercises "
            "SonarJS's rules standalone through ESLint, which is the one real "
            "path to those rules without server infrastructure.)"
        ),
    },
    {
        "tool": "StrykerJS",
        "package": "@stryker-mutator/core 10.0.0 + vitest-runner + typescript-checker (npm)",
        "status": "measured",
        "standin": None,
        "domain": "clocktower chime scheduling (ClocktowerChime)",
        "clean_means": (
            "Stryker's real mutation-testing run against ClocktowerChime kills "
            "every mutant its operators can generate -- 100% mutation score."
        ),
        "command": "stryker run",
        "notes": (
            "`@stryker-mutator/vitest-runner@10.0.0` genuinely throws "
            "(`TypeError: Converting circular structure to JSON` inside "
            "`VitestTestRunner.init`) against vitest 5.0.2 -- a real, verified "
            "incompatibility with vitest's newest major, released within the "
            "last few days per this sandbox's npm registry. Pinning vitest to "
            "4.1.11 (the last pre-5.0 release) fixed it. Separately, installing "
            "vitest 4.1.11 alongside the Stryker packages hit a real npm 10.9.7 "
            "arborist bug (`Cannot read properties of null (reading "
            "'edgesOut')` in `#loadPeerSet`) resolving vitest's own optional "
            "peer packages; `npm install --legacy-peer-deps` works around it. "
            "Both are genuine, verified environment findings, not fabricated."
        ),
    },
    {
        "tool": "cccc",
        "package": "cccc 3.2.0 (Debian apt package)",
        "status": "measured",
        "standin": None,
        "domain": "boiler pressure-relief control -- real C source (boiler_room.c)",
        "clean_means": (
            "cccc's own XML report shows 0 rejected (unparseable) lines and "
            "every module's McCabe cyclomatic complexity at or below 10."
        ),
        "command": "cccc src/boiler_room.c && python3 check_cccc.py",
        "notes": (
            "cccc cannot parse JavaScript or TypeScript at all -- it analyses "
            "C, C++ and Java. It was harvested into `TypeScript Tools` by the "
            "same real category error the project's own "
            "javascript-repos-build-contract.md documents for the sibling JS "
            "corpus. Rather than force TypeScript through a parser that rejects "
            "it, this folder gives cccc real C source -- the one thing it can "
            "actually analyse -- and documents the mismatch rather than papering "
            "over it. Same treatment as the sibling JavaScript-Tools-Clean "
            "corpus's cccc folder."
        ),
    },
    {
        "tool": "cdxgen",
        "package": "@cyclonedx/cdxgen 12.8.5 (npm)",
        "status": "measured",
        "standin": None,
        "domain": "cannery production line dependency ledger (CanneryLine)",
        "clean_means": (
            "cdxgen generates a complete, valid CycloneDX SBOM for the project "
            "with no generation errors."
        ),
        "command": "cdxgen -t js -o bom.json .",
        "notes": None,
    },
    {
        "tool": "covgate",
        "package": "covgate 0.2.0 (crates.io, built from source)",
        "status": "measured",
        "standin": None,
        "domain": "smokehouse batch timing (SmokehouseBatch)",
        "clean_means": (
            "covgate's diff-focused gate against the `feature` branch's real "
            "vitest v8/Istanbul coverage report passes all three configured "
            "gates (lines, branches, functions) at 100%."
        ),
        "command": "covgate check coverage/coverage-final.json --base main",
        "notes": (
            "Not on npm under this name (the folder's own fixtures explicitly "
            "target Vitest's Istanbul-format v8 coverage JSON, matching "
            "`covgate`'s real crates.io description, \"diff-focused coverage "
            "gates for local CI, pull requests, and autonomous coding agents\"); "
            "built from source via `cargo install covgate` against crates.io, "
            "which is reachable here. Uses a real `main`/`feature` git history, "
            "same convention as the corpus's diff-cover folder."
        ),
    },
    {
        "tool": "debtmap",
        "package": "debtmap 0.24.1 (crates.io, built from source)",
        "status": "measured",
        "standin": None,
        "domain": "windmill gear ratio calculation (windmillGears)",
        "clean_means": (
            "debtmap's real tree-sitter-based TypeScript analysis reports zero "
            "technical-debt items above its default score threshold."
        ),
        "command": "debtmap analyze src --languages typescript",
        "notes": (
            "Not on npm (same finding as the sibling JavaScript corpus); real "
            "Rust CLI with genuine tree-sitter TypeScript support, built from "
            "crates.io in this session. Pointing it at `.` instead of `src` "
            "made it hang past 2 minutes walking `node_modules` -- scoping the "
            "path to `src` avoids that and is the correct usage regardless."
        ),
    },
    {
        "tool": "dependency-cruiser",
        "package": "dependency-cruiser 18.4.0 (npm)",
        "status": "measured",
        "standin": None,
        "domain": "spice market pricing ledger (SpiceMarketLedger)",
        "clean_means": (
            "dependency-cruiser's real module graph over the spice-market "
            "source has zero circular-dependency and zero orphan-module "
            "violations."
        ),
        "command": "depcruise src --config .dependency-cruiser.cjs --output-type err",
        "notes": (
            "Borrows the host TypeScript compiler (per the project's own "
            "typescript-version-metric-matrix.md) rather than bundling one, so "
            "it tracks whatever `typescript` version this folder pins (5.9.3)."
        ),
    },
    {
        "tool": "diff-cover",
        "package": "diff_cover 10.6.0 (PyPI)",
        "status": "measured",
        "standin": None,
        "domain": "cooperage stave yield tracking (CooperageYield)",
        "clean_means": (
            "`diff-cover` reports 100% coverage on every line changed on the "
            "`feature` branch, read from a real vitest v8/cobertura coverage "
            "report over real git history."
        ),
        "command": "diff-cover coverage/cobertura-coverage.xml --compare-branch main",
        "notes": (
            "Same package already used in the Python/JavaScript/Java corpora; "
            "reads vitest's own cobertura reporter output over a real "
            "`main`/`feature` git history."
        ),
    },
    {
        "tool": "eslint-plugin-security",
        "package": "eslint-plugin-security 4.1.0 (npm)",
        "status": "measured",
        "standin": None,
        "domain": "session token vault (SessionVault)",
        "clean_means": (
            "eslint-plugin-security's recommended rules report zero findings "
            "against SessionVault, which issues and verifies tokens with "
            "`crypto.randomBytes`/`timingSafeEqual` and no dynamic `require`, "
            "`eval`, or unsafe regex."
        ),
        "command": "eslint src/",
        "notes": None,
    },
    {
        "tool": "eslint-plugin-sonarjs",
        "package": "eslint-plugin-sonarjs 4.2.2 (npm)",
        "status": "measured",
        "standin": None,
        "domain": "toll booth lane pricing (TollBooth)",
        "clean_means": (
            "eslint-plugin-sonarjs's recommended config reports zero cognitive-"
            "complexity, duplicate-branch or code-smell findings against "
            "TollBooth."
        ),
        "command": "eslint src/",
        "notes": (
            "This is the one real, standalone way to exercise SonarJS's rule "
            "engine without a SonarQube/SonarCloud server -- see the separate "
            "SonarJS folder's notes."
        ),
    },
    {
        "tool": "fast-check",
        "package": "fast-check 4.10.2 (npm)",
        "status": "measured",
        "standin": None,
        "domain": "brewery kettle unit conversion (brewKettle)",
        "clean_means": (
            "Two real property-based tests (thousands of generated cases each, "
            "via vitest) hold for every input: litres round-trip through "
            "gallons, and a blended temperature always falls within the range "
            "of its two inputs."
        ),
        "command": "vitest run",
        "notes": None,
    },
    {
        "tool": "jscpd",
        "package": "jscpd 5.3.3 (npm)",
        "status": "measured",
        "standin": None,
        "domain": "apiary hive inspection log (ApiaryHive)",
        "clean_means": (
            "`jscpd` finds zero duplicate blocks in ApiaryHive's own source at "
            "5 lines / 30 tokens."
        ),
        "command": "jscpd src/ --min-lines 5 --min-tokens 30 --threshold 0",
        "notes": (
            "Same package already used corpus-wide (Python/JavaScript/Java) "
            "both as a named tool's own folder and as the corpus-wide "
            "cross-folder duplication check."
        ),
    },
    {
        "tool": "knip",
        "package": "knip 6.38.0 (npm)",
        "status": "measured",
        "standin": None,
        "domain": "canal lockkeeper pass log (LockkeeperLog)",
        "clean_means": (
            "knip reports zero unused files, exports or dependencies from its "
            "declared entry point."
        ),
        "command": "knip",
        "notes": (
            "Per the project's own typescript-version-metric-matrix.md, knip 6 "
            "dropped `typescript` entirely in favour of `oxc-parser` -- it is "
            "version-blind to the TypeScript compiler (Class B)."
        ),
    },
    {
        "tool": "license-checker-rseidelsohn",
        "package": "license-checker-rseidelsohn 5.0.1 (npm)",
        "status": "measured",
        "standin": None,
        "domain": "tannery hide-batch ledger (TanneryLedger)",
        "clean_means": (
            "A production-dependency license scan reports zero packages, "
            "because the project ships zero runtime dependencies -- clean by "
            "construction, not by today's license data."
        ),
        "command": "license-checker-rseidelsohn --production --onlyAllow \"MIT;ISC;BSD-2-Clause;BSD-3-Clause;Apache-2.0;0BSD\" --excludePrivatePackages",
        "notes": (
            "Installs with an EBADENGINE warning (wants Node >=24/npm >=11; "
            "this sandbox has Node 22/npm 10) but runs correctly regardless."
        ),
    },
    {
        "tool": "mewt",
        "package": "mewt 4.0.0 (crates.io, built from source)",
        "status": "measured",
        "standin": None,
        "domain": "forge quench temper grading (ForgeTemper)",
        "clean_means": (
            "mewt's real mutation campaign against ForgeTemper (comprehensive "
            "mode) catches all 30 generated mutants -- zero survive."
        ),
        "command": "mewt run src --comprehensive",
        "notes": (
            "Not on npm under this name (the npm package `mewt` is an "
            "unrelated immutability micro-library); the real tool is a Rust "
            "mutation-testing framework, confirmed by `cargo search` "
            "(\"Mutation testing framework with multi-language support\") and "
            "matching the harvested folder's own per-language fixture layout "
            "(cpp/daml/go/javascript/...). Built from crates.io. Runs the "
            "project's real vitest suite as its test command."
        ),
    },
    {
        "tool": "monocart-coverage-reports",
        "package": "monocart-coverage-reports 2.13.0 (npm)",
        "status": "measured",
        "standin": None,
        "domain": "quarry crane lift capacity (QuarryCrane)",
        "clean_means": (
            "`mcr` reports 100% line/statement/function/branch V8 coverage for "
            "QuarryCrane's own source, scoped away from its own tooling via "
            "`--filter`."
        ),
        "command": "mcr --filter \"**/build/src/**\" node build/tools/driver.js -r v8,json-summary -o coverage-report",
        "notes": (
            "The companion `vitest-monocart-coverage` adapter pins "
            "`@vitest/coverage-v8` to `^4.1.2`, which conflicts with this "
            "sandbox's current vitest (5.0.2) and crashed npm's own arborist "
            "resolver -- so this folder drives monocart-coverage-reports "
            "directly with its own `mcr` CLI wrapping a plain Node driver "
            "script, exactly as its own documentation shows for non-test-"
            "framework use, rather than forcing the vitest integration."
        ),
    },
    {
        "tool": "npm-check-updates",
        "package": "npm-check-updates 23.1.0 (npm)",
        "status": "measured",
        "standin": None,
        "domain": "distillery cask batch tracking (DistilleryBatch)",
        "clean_means": (
            "`ncu` reports \"All dependencies match the latest package "
            "versions\" -- every devDependency, including `typescript` itself, "
            "pinned to its current latest release."
        ),
        "command": "ncu",
        "notes": (
            "The only folder in the corpus pinned to TypeScript 7.0.2 rather "
            "than 5.9.3, deliberately: ncu's job is to flag anything short of "
            "latest, and 7.0.2 compiles this folder's plain (non-type-aware-"
            "tool) source with plain `tsc` without issue."
        ),
    },
    {
        "tool": "opentelemetry-sdk-node",
        "package": "@opentelemetry/sdk-node 0.222.0 + sdk-trace-node 2.11.0 + api 1.9.1 (npm)",
        "status": "measured",
        "standin": None,
        "domain": "lighthouse relay message tracing (LighthouseRelay)",
        "clean_means": (
            "A real `NodeTracerProvider` wired to an in-memory exporter "
            "confirms `relayMessage()` emits exactly one span with the "
            "expected name and attributes -- a real span, not an assumed one."
        ),
        "command": "node build/tools/driver.js",
        "notes": (
            "The project's own typescript-version-metric-matrix.md flags a "
            "real defect elsewhere in this family: an SDK wired up but never "
            "actually imported/used produces a structurally-zero span count "
            "while still exiting 0. This folder's driver asserts the span "
            "count and its attributes explicitly so that failure mode can't "
            "hide here."
        ),
    },
    {
        "tool": "oxc-coverage-instrument",
        "package": "oxc-coverage-instrument 0.13.0 (npm)",
        "status": "measured",
        "standin": None,
        "domain": "shipyard dock draft-limited berth reservation (ShipyardDock)",
        "clean_means": (
            "vitest's Istanbul coverage provider, instrumented by oxc-"
            "coverage-instrument's real native Oxc-AST instrumenter instead of "
            "istanbul-lib-instrument, reports 100% statement/branch/function/"
            "line coverage."
        ),
        "command": "vitest run --coverage",
        "notes": (
            "Wired in via the package's own documented "
            "`oxc-coverage-instrument/vitest` adapter "
            "(`createOxcInstrumenter`), which needs `@vitest/coverage-istanbul` "
            ">=4.1.5 -- pinned to vitest/coverage-istanbul 4.1.11 here for the "
            "same reason as the StrykerJS folder."
        ),
    },
    {
        "tool": "oxlint",
        "package": "oxlint 1.86.0 (npm)",
        "status": "measured",
        "standin": None,
        "domain": "grain silo fill-ratio tracking (GrainSilo)",
        "clean_means": (
            "`oxlint` (own Rust parser, no tsc) reports zero findings against "
            "GrainSilo."
        ),
        "command": "oxlint src/",
        "notes": None,
    },
    {
        "tool": "pydriller",
        "package": "PyDriller 2.12 (PyPI)",
        "status": "measured",
        "standin": None,
        "domain": "millpond water-level history (MillpondHistory)",
        "clean_means": (
            "PyDriller mines MillpondHistory's real git history and reports "
            "the expected commit count and author set."
        ),
        "command": "python3 -c \"from pydriller import Repository; ...\"",
        "notes": (
            "Same package and same three synthetic co-authors (Ada Renwick, "
            "Mikkel Aas, Priya Nallan) already used for this purpose in the "
            "sibling Python/JavaScript/Java corpora."
        ),
    },
    {
        "tool": "ts-morph",
        "package": "ts-morph 28.0.0 (npm)",
        "status": "measured",
        "standin": None,
        "domain": "orchard tree-block survey (OrchardSurvey)",
        "clean_means": (
            "ts-morph's real Compiler-API-backed `Project` loads OrchardSurvey "
            "with zero pre-emit diagnostics and zero unresolved identifiers."
        ),
        "command": "node build/tools/checkResolution.js",
        "notes": (
            "Per the project's own typescript-version-metric-matrix.md, "
            "ts-morph 28.0.0 bundles its own TypeScript ~6.0.2 compiler "
            "internally regardless of the project's own pinned 5.9.3 -- "
            "consistent behaviour, not a version mismatch bug."
        ),
    },
    {
        "tool": "ts-unused-exports",
        "package": "ts-unused-exports 11.0.1 (npm)",
        "status": "measured",
        "standin": None,
        "domain": "harbor tariff calculation (HarborTariff)",
        "clean_means": (
            "`ts-unused-exports tsconfig.json` reports \"0 modules with unused "
            "exports\"."
        ),
        "command": "ts-unused-exports tsconfig.json",
        "notes": None,
    },
    {
        "tool": "vitest",
        "package": "vitest 5.0.2 (npm)",
        "status": "measured",
        "standin": None,
        "domain": "tidepool water-quality log (TidepoolLog)",
        "clean_means": (
            "`vitest run` passes all tests against TidepoolLog with zero "
            "failures."
        ),
        "command": "vitest run",
        "notes": (
            "The one folder in the corpus that keeps vitest at its current "
            "latest (5.0.2) rather than 4.1.11 -- it needs nothing from the "
            "Stryker/oxc-coverage-instrument ecosystem that pinned that version "
            "back, so it exercises vitest itself at the version everything "
            "else in this corpus had to work around."
        ),
    },
    {
        "tool": "Bearer CLI",
        "package": "bearer/bearer (Go binary / GitHub release)",
        "status": "not_installed",
        "standin": None,
        "domain": "patient intake form handling (IntakeForm)",
        "clean_means": (
            "A Bearer scan of IntakeForm would report zero sensitive-data-flow "
            "findings -- raw notes are redacted to a length-only summary "
            "before storage and nothing is logged."
        ),
        "command": "bearer scan .",
        "notes": (
            "Bearer's real SAST/data-flow scanner ships only as a GitHub "
            "Release binary (curl-install script or Docker image); GitHub "
            "Releases return 403 here. The npm package literally named "
            "`bearer` is an unrelated HTTP auth-header micro-library (`bearer` "
            "@ 0.0.20, \"Bearer authentication module using token and "
            "Authorization HTTP header\") and was not substituted for it."
        ),
    },
    {
        "tool": "red-dragon",
        "package": "(no real package under this name touches TypeScript)",
        "status": "not_installed",
        "standin": None,
        "domain": "n/a -- genuine roster/category defect, documented rather than fabricated",
        "clean_means": "n/a",
        "command": "n/a",
        "notes": (
            "The harvested `red-dragon` folder holds Python test files for a "
            "COBOL abstract-syntax-graph parser and LLM-based AST repair/Java-"
            "execution pipeline -- a legacy-mainframe-modernization tool with "
            "no connection to TypeScript at all. No package named `red-dragon` "
            "on npm or crates.io does anything COBOL- or AST-repair-related; "
            "the only hit, on PyPI, is a 3.9KB joke package (\"A Python package "
            "that awakens the red dragon\") with no real functionality. This is "
            "a genuine roster defect in the harvested `TypeScript Tools` set, "
            "not a tool this sandbox merely can't reach -- so, unlike every "
            "other NOT_INSTALLED entry above, there is no real tool to name a "
            "command for and no folder contents to build here."
        ),
    },
]
