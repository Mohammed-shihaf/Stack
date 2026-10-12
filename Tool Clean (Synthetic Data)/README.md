# Clean TypeScript tool corpus -- boundary-version measured

40 tool-named folders, one per tool, mirroring the layout of the harvested `TypeScript Tools` set. Where that set holds each tool's **own upstream test suite**, this one holds synthetic projects built to the opposite goal: every tool must run and report **nothing wrong**.

This is the negative control the tool-evaluation corpora do not have. A family where nothing ever fires cannot distinguish *correctly detected nothing* from *the scan never ran*. A clean baseline is what makes a zero legible -- and "declared support is a claim; invoking is the fact."

## Boundary-version structure

25 of the 40 tools are exploded into five per-tool subfolders, one per boundary Node.js major, mirroring `Python-Tools-Clean`'s `py3.X/` pattern:

| Family | Node version | Role |
| --- | --- | --- |
| `node12` | 12.22.12 (npm 6.14.16) | earliest |
| `node14` | 14.21.3 (npm 6.14.18) | earliest+1 |
| `node20` | 20.20.2 (npm 10.8.2) | middle |
| `node24` | 24.21.0 (npm 11.19.0) | latest-1 |
| `node26` | 26.10.0 (npm 11.19.1) | latest |

**All five families are LIVE by default, not code-only.** Real Node 12/14/20/24/26 binaries (obtained from the `actions/node-versions` GitHub-release manifest, since `nodejs.org` itself returns 403 at this sandbox's egress proxy) were installed, and `registry.npmjs.org` is fully reachable here, so every family actually runs `npm install` and the tool's real command -- a family is only marked NOT INSTALLED / CODE-ONLY where a genuine, reproducible incompatibility was confirmed live (never assumed from a package's declared `engines` field alone). This is a deliberately more rigorous bar than the sibling `JavaScript-Tools-Clean` corpus, which treats node12/14 as code-only by construction; here, node12/14 get the same live verification as node20/24/26 do, and only fail over to NOT INSTALLED / CODE-ONLY when a real trio of mutually-compatible package versions does not exist.

The remaining 15 tools stay single-version / unversioned, split into four groups:

- **Unversioned (2): `diff-cover`, `pydriller`** -- git-history miners; what they measure is commit history, not language-version compatibility, exactly like the sibling Python/JS/Java corpora's equivalents.
- **Added by the roster alignment of 2026-10-07 (7): `reson`, `git-hot`, `DepScout`, `TraceGraph`, `ORT`, `Dependabot`, `GitHub API`** -- roster tools that had no folder here. Each is one Node-independent folder (no `node12` ... `node26` split) holding a small synthetic project the tool can run on; see "Roster alignment (2026-10-07)" below.
- **Node-independent, original build (5): `Bearer CLI`, `CVE Lite CLI`, `Grype`, `OSV-Scanner`, `SonarJS`** -- one flat folder each. Their earlier "always NOT INSTALLED" label is corrected in the table below: the Bearer CLI and OSV-Scanner release binaries do download and run here, and the three software-composition tools (`CVE Lite CLI`, `Grype`, `OSV-Scanner`) no longer ship a lockfile.
- **`red-dragon`** -- has a folder again, now with a real TypeScript project; the earlier note that it was a "roster defect" was wrong (see below).

## Measured results (25 versioned tools x 5 families = 125 cells)

| Tool | node12 | node14 | node20 | node24 | node26 |
| --- | --- | --- | --- | --- | --- |
| Biome | NOT INSTALLED | CLEAN | CLEAN | CLEAN | CLEAN |
| ESLint | CLEAN | CLEAN | CLEAN | CLEAN | CLEAN |
| Lizard | CLEAN | CLEAN | CLEAN | CLEAN | CLEAN |
| Opengrep | CLEAN | CLEAN | CLEAN | CLEAN | CLEAN |
| StrykerJS | NOT INSTALLED | NOT INSTALLED | CLEAN | CLEAN | CLEAN |
| cccc | CLEAN | CLEAN | CLEAN | CLEAN | CLEAN |
| cdxgen | CLEAN | CLEAN | CLEAN | CLEAN | CLEAN |
| covgate | NOT INSTALLED | NOT INSTALLED | CLEAN | CLEAN | CLEAN |
| debtmap | CLEAN | CLEAN | CLEAN | CLEAN | CLEAN |
| dependency-cruiser | CLEAN | CLEAN | CLEAN | CLEAN | CLEAN |
| eslint-plugin-security | CLEAN | CLEAN | CLEAN | CLEAN | CLEAN |
| eslint-plugin-sonarjs | CLEAN | CLEAN | CLEAN | CLEAN | CLEAN |
| fast-check | NOT INSTALLED | CLEAN | CLEAN | CLEAN | CLEAN |
| jscpd | CLEAN | CLEAN | CLEAN | CLEAN | CLEAN |
| knip | NOT INSTALLED | NOT INSTALLED | CLEAN | CLEAN | CLEAN |
| license-checker-rseidelsohn | CLEAN | CLEAN | CLEAN | CLEAN | CLEAN |
| mewt | NOT INSTALLED | NOT INSTALLED | CLEAN | CLEAN | CLEAN |
| monocart-coverage-reports | NOT INSTALLED | NOT INSTALLED | CLEAN | CLEAN | CLEAN |
| npm-check-updates | CLEAN | CLEAN | CLEAN | CLEAN | CLEAN |
| opentelemetry-sdk-node | CLEAN | CLEAN | CLEAN | CLEAN | CLEAN |
| oxc-coverage-instrument | NOT INSTALLED | NOT INSTALLED | CLEAN | CLEAN | CLEAN |
| oxlint | CLEAN | CLEAN | CLEAN | CLEAN | CLEAN |
| ts-morph | CLEAN | CLEAN | CLEAN | CLEAN | CLEAN |
| ts-unused-exports | CLEAN | CLEAN | CLEAN | CLEAN | CLEAN |
| vitest | NOT INSTALLED | CLEAN | CLEAN | CLEAN | CLEAN |

**Tally: 110 CLEAN, 0 FINDING, 15 NOT INSTALLED / CODE-ONLY** (out of 125 cells).

Every NOT INSTALLED / CODE-ONLY cell above has a documented, live-confirmed reason in that tool's own README (`## Per-Node-family results`) -- most trace back to one root fact: `vitest` itself has no genuine Node 12 release and its first real Node 14 release (0.34.6) predates the coverage/runner package lineage several of these tools depend on, so every tool that shells out to vitest (StrykerJS, covgate, mewt, oxc-coverage-instrument, fast-check, vitest itself) inherits that ceiling at node12, and most of them at node14 too. `Biome` and `knip` separately have no Node 12 (`knip`: no Node 14 either) release at all. `monocart-coverage-reports` is the one genuine dual-constraint case: no single release threads both "ships an `mcr` CLI" and "doesn't crash under Node 12/14's V8 on its own bundled vendor file" (see its README for the full bisection).

Plus the 2 unversioned git-history tools, both CLEAN:

| Tool | Result | Command |
| --- | --- | --- |
| diff-cover | CLEAN | `diff-cover coverage/cobertura-coverage.xml --compare-branch main` |
| pydriller | CLEAN | `python3 -c "from pydriller import Repository; ..."` |

**NOT INSTALLED, Node-version-independent (5):** unchanged in shape from the original single-version build -- blocked by this sandbox's egress allowlist or by needing infrastructure that doesn't exist here, not by any Node.js version:

| Tool | Reason |
| --- | --- |
| **Bearer CLI** | The v2.1.1 release binary downloads and runs here (measured 2026-10-07; the earlier statement that GitHub Releases return 403 was specific to that session). What fails is the scanner's first-run download of its default rules (`bearer-rules`, 403), so a scan cannot complete in this sandbox. The npm package literally named `bearer` is an unrelated HTTP auth-header micro-library and was not substituted for it. |
| **CVE Lite CLI** | cve-lite-cli itself installs and runs fine (real npm package), but its only vulnerability source is api.osv.dev, which returns 403 at this sandbox's egress proxy (measured directly). --offline mode only reads a local advisory database that must itself be populated against that same blocked endpoint, so a report from an empty database is vacuous, not a real measurement. |
| **Grype** | Grype ships only as a GitHub Release binary or via `go install`; both are blocked here (GitHub Releases: 403; `proxy.golang.org`: not in the egress allowlist, measured directly). No apt package exists. |
| **OSV-Scanner** | The v2.6.0 release binary downloads and runs here (measured 2026-10-07) and parses the CycloneDX SBOM in this folder; the vulnerability lookup that follows (`POST api.osv.dev/v1/querybatch`) returns 403 here, so no advisory count is quoted. |
| **SonarJS** | SonarJS is the analyzer engine embedded in SonarQube/SonarCloud, not a standalone CLI -- no live Sonar server is reachable from this sandbox. The npm package literally named `sonarjs` is `sonarjs-cli`, deprecated and itself only an uploader client for a Sonar server. (The separate `eslint-plugin-sonarjs` folder exercises SonarJS's rules standalone through ESLint, the one real path without server infrastructure.) |

**red-dragon:** The harvested `red-dragon` folder holds the project's own Python tests (including a COBOL front end). The earlier note called red-dragon a COBOL-only tool with no TypeScript support; that was wrong. Upstream's README describes a multi-language pipeline (tree-sitter front ends, an intermediate representation, a control-flow graph, reaching definitions and def-use chains) and the repository has a TypeScript front end (`interpreter/frontends/typescript`). This folder now holds a real TypeScript project that red-dragon (pinned commit `c287bb2`) lowers and analyses; see its README.

The exit-code/verdict vocabulary throughout this corpus never collapses a finding, a skip, and a genuine absence into the same result -- CLEAN, FINDING, NOT_INSTALLED, and CODE-ONLY stay distinct, and a missing binary must never masquerade as a clean scan.

## Genuine findings worth calling out

Every fix below was reached by live-testing against the real npm registry and the real pinned Node/npm binaries in this sandbox, not by reading a package's `engines` field and assuming it is accurate -- several of the packages below have a real gap in their own version history where no `engines` field was ever declared, which would silently mislead a naive "newest unrestricted version" resolver.

**`jscpd` (node12/14): a real version-history gap.** Nothing between 3.2.1 (`engines: >=8.9`) and 5.0.4 (`engines: >=18`) ever declares an `engines` field; the obvious middle pick, 4.3.0, crashes live under node12 (`Unexpected token '?'`, undeclared optional chaining in its own bundled code) and under node14 (ESM-only `commander` transitive dependency breaking CJS `require`). Pinned node12/14 to 3.2.1 instead, confirmed clean.
**`license-checker-rseidelsohn` (node12): same shape.** 2.2.0 throws `Unexpected token '.'` live under node12; 1.2.2 (zero production deps, so a clean report either way) confirmed working.
**`eslint-plugin-sonarjs` (node12/14): same shape, two different breaks.** 4.2.2 throws on undeclared optional chaining under node12 and on `node:path/posix` (a Node 16+ builtin) under node14. Bisected live to 0.15.0 (`engines: >=12`) and 0.23.0 (`engines: >=14`); these older releases only export a `sonarjs/recommended` config (not `recommended-legacy`), so the generator's legacy ESLint config was updated to match.
**`ts-morph` (node12/14): three separate bundled-syntax regressions, bisected live across the whole 11.0.3-28.0.0 range.** 19.0.0+ uses undeclared optional chaining in bundled `@ts-morph/common` (breaks node12); 21.0.0+ adds private class methods `#advance()` (breaks node12 further); 26.0.0+ adds static initialization blocks (breaks node14 too). Pinned node12 to 18.0.0 and node14 to 25.0.1, the newest release confirmed clean at each boundary; node20/24/26 keep 28.0.0 unchanged.
**`monocart-coverage-reports` (node12/14): a genuine dual-constraint defect, not fixed, documented instead.** Every release old enough to avoid loading its current bundled vendor file ships no `mcr` CLI at all; every release that does ship `mcr` (2.2.0 onward) loads that bundled vendor file, which itself throws a syntax error under both node12's and node14's V8 -- confirmed persisting even with the unrelated `commander` dependency removed from the tree. No version threads both needles, so node12/14 are pinned to no version at all for this tool (same treatment as StrykerJS's node12/14 absence: a documented, live-confirmed gap, not a forced workaround).
**`opentelemetry-sdk-node` (node12/14): a real API-shape change, not a bug.** `@opentelemetry/sdk-trace-node`'s own exported surface genuinely changed across majors -- at node12's pinned 1.3.1, `InMemorySpanExporter`/`SimpleSpanProcessor` are only exported from `sdk-trace-base`, and the `NodeTracerProvider` only supports the older `addSpanProcessor()` method, not the newer `spanProcessors` constructor option (removed from the 2.x line entirely). Rather than force one driver script to satisfy both API shapes, the test-harness file (`tools/driver.ts`, not domain source) has two variants -- legacy (node12/14) and modern (node20/24/26) -- selected per family by the generator, mirroring the ESLint flat-vs-legacy-config split below. Separately, node12's own pinned sdk-trace-node declares a real peer ceiling on `@opentelemetry/api` (`>=1.0.0 <1.2.0`, confirmed live via registry query) that the corpus-wide 1.9.1 pin violated; node12 now pins `@opentelemetry/api` 1.1.0 instead.
**ESLint-family tools (node12 only): a real auto-detection conflict, not a package bug.** ESLint 8.57.1 auto-detects a flat `eslint.config.js` anywhere up the ancestor directory tree from cwd unless explicitly told otherwise, so node12's family folder was accidentally picking up the tool-root's own flat config (which needs a node20+-only `typescript-eslint` package) instead of its own `.eslintrc.json`. Fixed by setting `ESLINT_USE_FLAT_CONFIG=false` for node12/14 and `=true` for node20/24/26 at verification time, rather than relying on auto-detection.
**Biome/node12: a real silent-fetch false positive, caught and closed.** `npx biome check src/` initially reported a false "OK" at node12 because npx silently fell through to fetching the latest `@biomejs/biome` from the registry when the locally-pinned devDependency had been deliberately dropped (Biome has no Node 12 release). Fixed two ways: every `npx` invocation across the whole verification harness now runs `npx --no-install` (fails loudly instead of silently fetching an unpinned version), and the harness checks every family's own `.UNAVAILABLE` marker and skips the live run entirely rather than attempting one it knows cannot succeed.
**A real npm6 postinstall-ordering bug, worked around with a 3-stage install retry.** `leveldown@5.6.0` (a jscpd transitive dependency) and `protobufjs@7.6.6` (an opentelemetry-sdk-node transitive dependency) both run a postinstall hook under npm 6.14.x (node12/14's own npm) before their own native-binding helper package has actually landed in `node_modules` -- a real npm6 install-ordering bug, not a stale lockfile (confirmed by testing with the lockfile deleted first). `npm install` now retries with `--legacy-peer-deps` and then `--ignore-scripts` as a 3rd-stage fallback; confirmed the dropped native bindings aren't needed for either folder's plain CLI usage.
**Real git history, preserved per family.** `covgate` mines a real multi-branch git history (`main`/`feature`, 4 real commits) that was carried into all 5 of its family subfolders; `diff-cover` and `pydriller` keep their own real history untouched (they are unversioned, so `generate.py` never touches them).
**`Opengrep` was rescued with a real, honestly-labeled stand-in, not abandoned.** Opengrep ships only as a GitHub Release binary (blocked here) and the npm package literally named `opengrep` is a parked placeholder. Opengrep is a semgrep fork sharing its rule format, so `semgrep` -- already installed and Node-version-independent -- was run for real against a local custom ruleset and found zero findings across all 5 families.
**`cccc` is a genuine category error, left in on purpose.** It analyses C, C++ and Java -- never JavaScript or TypeScript -- so this folder gives it real C source (a boiler pressure-relief controller) instead of forcing TypeScript through a parser that rejects it outright. Node-version-independent, so all 5 families are identically CLEAN.
**`covgate`, `mewt`, and `debtmap` are real crates.io tools with no npm presence at all**, built from source against crates.io (reachable here). `Lizard` is Node-version-independent (PyPI); all four are CLEAN across every family.

## Roster alignment (2026-10-07)

The tool list the team supplied (`TypeScript_All_Tools.xlsx`, 39 tools) is the roster. This pass compared it with the folders here and with `Tool Triggering (Synthetic Data)/` and closed the gaps.

| Tool | What changed in this folder | Result |
| --- | --- | --- |
| `reson` | new: tide-gauge project (`src/tideGauge.ts`) | measured: 0 duplicate blocks |
| `git-hot` | new: lamp log + `make-history.sh` (builds a deterministic history; no git bundle) | measured: max churn 0 |
| `DepScout` | new: door-lock service, current dependencies (`zod` 4.6.5) | measured: no release-age alert |
| `TraceGraph` | new: ferry crossing log traced with `@tracegraph/trace-js` 0.3.1 | measured: 8 events, 0 `error` events |
| `ORT` | new: licence ledger, permissive dependencies only; no lockfile | not run (JVM tool); licences read from the registry |
| `Dependabot` | new: dock-lock scheduler, current pins, `.github/dependabot.yml` | not run (needs a GitHub repository) |
| `GitHub API` | new: release watcher pointing at `octokit/rest.js` | not run (sandbox GitHub API restriction) |
| `red-dragon` | real TypeScript project (`src/pumpRoom.ts`) and a README that no longer calls the tool a defect | measured: no dead stores, no maybe-uninitialised reads |
| `Bearer CLI` | README corrected; project unchanged | not measured (rules download blocked) |
| `CVE Lite CLI`, `Grype`, `OSV-Scanner` | `package-lock.json` removed; `OSV-Scanner` and `Grype` carry a CycloneDX `sbom.cdx.json` | `OSV-Scanner` parses the SBOM (2 packages) |

**No lockfile anywhere in this folder.** A `package-lock.json` in a sub-folder makes Testable treat that folder as its own project and run every tool on it, so none is shipped. `CVE Lite CLI` falls back to the exact-pinned direct dependencies in `package.json`; `Grype` and `OSV-Scanner` read the SBOM.

The folders added by this pass are written by `.github/scripts/fix_typescript_corpus.py`; `_generator/` does not produce them.

## Layout

Every versionable tool folder now holds five independent, self-contained family subfolders:

```text
<Tool Name>/
  README.md            what clean means for this tool, the command, and the
                        per-family results table
  node12/               earliest supported family
  node14/               earliest+1
  node20/               middle
  node24/               latest-1
  node26/               latest
    src/                the synthetic project -- a different domain in every tool
    test/               the test suite, where the asserts live (vitest-based folders)
    tools/              only where the tool needs a driver script rather than
                        shipping its own CLI entry point (ts-morph, monocart,
                        opentelemetry-sdk-node)
    .git/               only where the tool mines real history (covgate)
    .UNAVAILABLE        only present when this family has no live-runnable trio;
                        lists which package(s) were dropped and why
_generator/             pin_table.py, generate.py, verify_live.py,
                        write_family_readmes.py, write_new_root_readme.py
```

The 2 unversioned tools (`diff-cover`, `pydriller`), the 5 Node-independent tools of the original build and the 7 tools added by the roster alignment keep a flat, single-version layout (`src/`, `test/`, `.git/` directly under the tool folder) -- there is no family split to make for a tool that either doesn't depend on Node.js version or never runs here at all.

## Rules every folder obeys

* **Every source file compiles clean (`tsc`) and its test suite passes, in every live family.** No tool's CLEAN is worth anything if the code underneath it doesn't actually build and run under that family's own real Node+npm binary.
* **A different domain, vocabulary and structural idiom in every tool folder** (ferry schedules, beacon signals, session vaults, toll booths, grain silos, lockkeeper logs, harbor tariffs, spice ledgers, orchard surveys, tidepool logs, brewery kettles, quarry cranes, clocktower chimes, apiary hives, cannery lines, distillery batches, tannery ledgers, shipyard docks, millpond history, cooperage yield, vineyard terraces, windmill gears, smokehouse batches, forge tempering, boiler rooms), so the duplicate detectors find nothing real between folders -- verified 0 cross-folder clones at 5 lines / 30 tokens (`jscpd . --min-lines 5 --min-tokens 30 --threshold 0`), including test files.
* **Pure ASCII.** Not every analyser reads source with the build file's declared encoding rather than the platform default, so a stray non-ASCII byte can change what a tool reports without changing what the interpreter accepts. Enforced at write time; verified: 0 non-ASCII bytes anywhere in the corpus.
* **Real multi-author git history where a tool needs one** (`covgate`; `diff-cover`/`pydriller` keep their own pre-existing history, untouched since they are unversioned): the same three synthetic authors used in the sibling Python, JavaScript and Java corpora -- Ada Renwick, Mikkel Aas, Priya Nallan -- across real, separately-dated commits, carried into all 5 of covgate's family subfolders identically.
* **No fabricated tool results, at any family.** Where a family genuinely cannot run a tool, the folder's `.UNAVAILABLE` marker and README say so with a live-confirmed reason, rather than being silently skipped or counted as passing; where a real adjacent tool could stand in (Opengrep -> semgrep), that stand-in was actually run and its real result reported -- never presented as the named tool's own output.

## Reproducing

```bash
python3 _generator/generate.py              # explode each versionable tool into node12/14/20/24/26
python3 _generator/verify_live.py            # real npm install + real run under all 5 families, every live tool
python3 _generator/write_family_readmes.py   # append the per-family results section to each tool's README
python3 _generator/write_new_root_readme.py  # regenerate this file from the same live_results.json
```

`generate.py` reads `pin_table.py` for per-family package pins (including every fix documented above) and writes a `.UNAVAILABLE` marker into any family folder where no live-runnable trio exists. `verify_live.py` needs real Node 12/14/20/24/26 binaries on `PATH` per family (this build used `actions/node-versions` GitHub-release tarballs, since `nodejs.org` itself returns 403 in this environment); it skips any family carrying a `.UNAVAILABLE` marker rather than letting `npx` silently fetch an unpinned replacement, retries `npm install` through a 3-stage fallback (plain -> `--legacy-peer-deps` -> `--ignore-scripts`), and sets `ESLINT_USE_FLAT_CONFIG` explicitly per family for the ESLint-family tools. `cccc` needs the `cccc` package installed via apt; `debtmap`/`covgate`/`mewt` need `cargo install`; `Lizard`/`diff-cover`/`pydriller` need `pip install lizard diff-cover pydriller`.

## Tool versions used for the measurement

Per-family pins live in `_generator/pin_table.py`; most tools pin the same version across all 5 families (only the package's own compatibility ceiling forces a per-family split). Every pin below was actually installed and invoked for real in at least one family.

```text
node                   12.22.12 / 14.21.3 / 20.20.2 / 24.21.0 / 26.10.0 (actions/node-versions)
npm                    6.14.16 / 6.14.18 / 10.8.2 / 11.19.0 / 11.19.1 (bundled per Node binary)
typescript             5.0.4 (node12) / 5.1.6 (node14) / 5.9.3 (node20/24/26)
biome                  (none)/(none) node12/14 -- no Node 12/14 release at all / 2.5.14 (node20/24/26)
eslint + typescript-eslint   per-family pin (node12/14 use .eslintrc.json + legacy config; node20/24/26 use flat eslint.config.js)
oxlint, ts-unused-exports, dependency-cruiser, cdxgen, npm-check-updates   per-family pin, same version policy as eslint above
ts-morph               18.0.0 (node12) / 25.0.1 (node14) / 28.0.0 (node20/24/26, bundles its own TS ~6.0.2 internally)
vitest                 (none) node12 / per-family pin node14/20/24/26; plain-vitest tools get an explicit vite companion pin at node20/24/26 (vitest 5.x only peer-depends on vite)
fast-check             (none) node12 / per-family pin node14/20/24/26
monocart-coverage-reports   (none)/(none) node12/14 -- genuine dual-constraint defect, see findings above / 2.13.0 (node20/24/26)
StrykerJS (@stryker-mutator/core)   (none)/(none) node12/14 -- no compatible vitest-runner+vitest trio / 10.0.0 (node20/24/26)
jscpd                  3.2.1 (node12/14) / 5.3.3 (node20/24/26)
license-checker-rseidelsohn   1.2.2 (node12) / 3.3.0 (node14) / 5.0.1 (node20/24/26)
oxc-coverage-instrument   (none)/(none) node12/14 -- needs @vitest/coverage-istanbul, no Node 12/14 vitest lineage / 0.13.0 (node20/24/26)
opentelemetry-sdk-node + sdk-trace-node + api   per-family pin, driver.ts has legacy (node12/14) and modern (node20/24/26) variants
eslint-plugin-security   per-family pin
eslint-plugin-sonarjs   0.15.0 (node12) / 0.23.0 (node14) / 4.2.2 (node20/24/26)
covgate                0.2.0 (crates.io, built from source; (none)/(none) node12/14 -- needs a vitest v8 coverage report)
mewt                   4.0.0 (crates.io, built from source; (none)/(none) node12/14 -- shells out to npx vitest run)
debtmap                0.24.1 (crates.io, built from source; Node-version-independent)
knip                   (none)/(none) node12/14 -- no Node 12/14 release at all / 6.38.0 (node20/24/26)
semgrep                1.178.0 (stand-in for Opengrep, local ruleset; Node-version-independent)
lizard                 1.24.0 (PyPI; Node-version-independent)
diff-cover (diff_cover)   10.6.0 (PyPI; unversioned)
pydriller              2.12 (PyPI; unversioned)
cccc                   3.2.0 (Debian apt package; Node-version-independent)
```

Verified on Linux, Ubuntu 24.04, across all 5 Node.js families listed above.
