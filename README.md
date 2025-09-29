# OrderKit - CS-241

One branch of the C# tool-evaluation corpus. Test **data**, not a product: tool
execution is not part of the build, and evaluation happens later.

## Branch

`CS-241`

## Cell

| Axis | Value |
|---|---|
| Bundler | SDK-style MSBuild |
| Package manager | NuGet (PackageReference) |
| Architecture | Monolith |

Projects:

- `OrderKit` (`src/OrderKit`)

## Target framework

`net8.0` - .NET 8

The first family in this corpus that is STILL IN SUPPORT (LTS, to 10 November 2026), and the first whose target framework MATCHES the pinned SDK -- every earlier family was built by an SDK newer than its own target. packages.config remains dead, so six of the 24 cells stay impossible.

## Language version

C# 12.0, taken as the default of the target framework. `LangVersion` is deliberately
never written to any project file, which is what keeps the family axis one number
instead of two.

The domain layer is written to that language subset exactly, and the lock is
verified by execution rather than asserted:

```
csc -langversion:12.0   ->  clean
csc -langversion:11.0   ->  error CS8025: Feature 'async function' is not available
```

## Supported tools

5 of the 19 tools in the roster are expected to fire on this branch. The rest exit
3 (cannot run here) or 4 (absent from this host), each with its reason in both
`run.sh` and `trigger.yaml`.

**A tool that does not fire is a result, not a failure.** What a family with *no*
firing tools cannot do is distinguish "correctly detected nothing" from "the scan
never ran" - so the source-level tools below are the built-in negative control:

- Lizard
- jscpd
- Semgrep
- PyDriller
- git log --numstat

| Tool | Status | Why |
|---|---|---|
| Lizard | active | Python tokeniser. Class B: own parser, never loads a compiler, so the TFM is irrelevant  |
| jscpd | active | Node, own tokeniser. Class B. |
| Dolos | not-installed | Node, tree-sitter C# grammar. Class B, and the sheet's declaration ('C# language-version |
| Semgrep | active | Python, tree-sitter C# grammar. Class B. |
| Opengrep | not-installed | Standalone binary, absent from this host. Class B when present. NOTE: the sheet declares |
| Trivy | not-installed | Standalone Go binary, absent from this host. Class C: reads manifests/lockfiles. |
| PyDriller | active | Python, reads git only. Class C: never touches the source language. |
| git log --numstat | active | stdlib git. Class C. Counts Co-authored-by trailers, not just the author field -- the Ty |
| diff-cover | skipped | Class C: reads Cobertura/OpenCover XML. No coverage report can be produced on this famil |
| Roslyn analyzers (cognitive complexity) | not-installed | The sheet says 'Roslyn', which is a compiler platform, not a package. Resolved here to S |
| Roslyn SAST analyzers | not-installed | The sheet says 'roslyn sast', also not a package. Resolved here to SecurityCodeScan + Mi |
| Roslyn SemanticModel.AnalyzeDataFlow | not-installed | PROPOSED REPAIR, not in the source sheet. The sheet assigns Data Flow to Stryker.NET, a  |
| dotnet list package --vulnerable | skipped | Requires PackageReference and an SDK-style project. Structurally impossible on the packa |
| Coverlet | not-installed | STATUS CHANGED AT THIS FAMILY. net45 and net46 sat below netstandard2.0, whose .NET Fram |
| AltCover | not-installed | Declares .NET Framework 2.0+ via a net20 recorder, so it is the one coverage tool in the |
| MiniCover | skipped | MiniCover 3.10.0 declares .NET SDK 8.0/9.0/10.0 only -- verified against its own MiniCov |
| Stryker.NET | skipped | Requires an SDK-style project and a modern SDK to run. Also: the sheet makes it primary  |
| OpenTelemetry (.NET) + OTLP exporter | not-installed | STATUS CHANGED AT THIS FAMILY, for the same reason as Coverlet: netstandard2.0 clears at |
| unilyze | absent | NOT A TOOL. The only package of this name anywhere is PyPI `unilyze` 0.2.1, 'Get detaile |

## Build

```bash
./build.sh
```

Restore will not succeed on a host where NuGet is unreachable; see `dataset.json`
`blockedHosts`.

## Test

```bash
./build.sh          # the test step is wired into the build
```

19 tests are declared. They are **not** executed in this corpus's build, because no
test framework can be restored.

## Tool entry points

```bash
python3 tools/tool_integration.py            # banner
python3 tools/tool_integration.py --verify   # every runner present and executable
python3 tools/tool_integration.py --run      # run them all, compare to dataset.json
python3 tools/full_check.py                  # cross-file consistency audit
```

## What is expected to fire

`dataset.json` asserts the answer rather than describing it, so a platform that
reports nothing for a given tool can be *proven* correct instead of assumed correct.
Every runner's expected exit code is recorded there, and
`tool_integration.py --run` exits **2** if any tool produces a result the dataset
does not already record - a new finding, as distinct from a measurement.
