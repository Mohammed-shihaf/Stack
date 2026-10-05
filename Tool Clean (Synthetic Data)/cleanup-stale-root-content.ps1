# cleanup-stale-root-content.ps1
#
# Purpose: TypeScript-Tools-Clean was rebuilt this session so every versionable
# tool now has 5 boundary-version family subfolders (node12, node14, node20,
# node24, node26), each with its own independent copy of src/, test/, tools/,
# package.json, package-lock.json and tsconfig.json pinned to that family's
# own Node + npm binary. The OLD flat single-version build is still sitting
# at each tool's ROOT alongside those family folders -- it is now redundant
# scaffolding, fully superseded by the family subfolders.
#
# This script removes ONLY that stale root-level content:
#   - the directories: src, test, tools
#   - the files: package.json, package-lock.json, tsconfig.json
# ...and ONLY at the root of each of the 25 versionable / node-independent
# tools listed below. It never touches anything inside node12/14/20/24/26,
# and it never removes:
#   - README.md (kept everywhere -- it documents the tool + the 5 families)
#   - any other root-level file: eslint.config.js, knip.json, mewt.toml,
#     biome.json, security-rules.yml, stryker.config.mjs,
#     .dependency-cruiser.cjs, covgate.toml, vitest.config.ts,
#     check_cccc.py, .git, .gitignore -- these are tool-identity config,
#     not per-version build output, so they stay at the root.
#
# diff-cover and pydriller are UNVERSIONED (git-history miners with no
# family split) and are completely excluded from this script -- it never
# looks at them. The 5 ALWAYS_NOT_INSTALLED tools (Bearer CLI, CVE Lite CLI,
# Grype, OSV-Scanner, SonarJS) and red-dragon (NO_FOLDER) are excluded too,
# since they have no stale root build to clean up.
#
# USAGE:
#   Dry run (default; lists exactly what WOULD be removed, deletes nothing):
#       .\cleanup-stale-root-content.ps1
#
#   Real deletion (after you've reviewed the dry-run output):
#       .\cleanup-stale-root-content.ps1 -Execute
#
# Safe to re-run: anything already removed is simply reported as not present.

param(
    [switch]$Execute
)

$ErrorActionPreference = "Stop"

$corpusRoot = "C:\Users\Prajith K\Desktop\TypeScript Tools\TypeScript-Tools-Clean"

# The 25 versionable / node-independent tools. diff-cover and pydriller
# (UNVERSIONED), the 5 ALWAYS_NOT_INSTALLED tools, and red-dragon
# (NO_FOLDER) are deliberately NOT in this list.
$tools = @(
    "Biome",
    "StrykerJS",
    "ESLint",
    "cccc",
    "Lizard",
    "debtmap",
    "Opengrep",
    "cdxgen",
    "covgate",
    "dependency-cruiser",
    "eslint-plugin-security",
    "eslint-plugin-sonarjs",
    "fast-check",
    "jscpd",
    "knip",
    "license-checker-rseidelsohn",
    "mewt",
    "monocart-coverage-reports",
    "npm-check-updates",
    "opentelemetry-sdk-node",
    "oxc-coverage-instrument",
    "oxlint",
    "ts-morph",
    "ts-unused-exports",
    "vitest"
)

$staleDirs  = @("src", "test", "tools")
$staleFiles = @("package.json", "package-lock.json", "tsconfig.json")

if ($Execute) {
    Write-Host "RUNNING IN DELETE MODE -- stale root content will be removed." -ForegroundColor Red
} else {
    Write-Host "DRY RUN -- nothing will be deleted. Re-run with -Execute to actually delete." -ForegroundColor Yellow
}
Write-Host ""

$totalDirsRemoved = 0
$totalFilesRemoved = 0

foreach ($tool in $tools) {
    $toolRoot = Join-Path $corpusRoot $tool

    if (-not (Test-Path $toolRoot)) {
        Write-Warning "Tool folder not found, skipping: $toolRoot"
        continue
    }

    $actions = @()

    foreach ($d in $staleDirs) {
        $p = Join-Path $toolRoot $d
        if (Test-Path $p -PathType Container) {
            $actions += [PSCustomObject]@{ Type = "dir"; Path = $p }
        }
    }

    foreach ($f in $staleFiles) {
        $p = Join-Path $toolRoot $f
        if (Test-Path $p -PathType Leaf) {
            $actions += [PSCustomObject]@{ Type = "file"; Path = $p }
        }
    }

    if ($actions.Count -eq 0) {
        continue
    }

    Write-Host "== $tool ==" -ForegroundColor Cyan
    foreach ($a in $actions) {
        if ($Execute) {
            if ($a.Type -eq "dir") {
                Remove-Item -Path $a.Path -Recurse -Force
                $totalDirsRemoved++
            } else {
                Remove-Item -Path $a.Path -Force
                $totalFilesRemoved++
            }
            Write-Host "  removed  $($a.Path)" -ForegroundColor Green
        } else {
            Write-Host "  would remove  $($a.Path)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
if ($Execute) {
    Write-Host "Done. Removed $totalDirsRemoved stale directories and $totalFilesRemoved stale files." -ForegroundColor Cyan
} else {
    Write-Host "Dry run complete. Re-run with -Execute to actually delete the items listed above." -ForegroundColor Cyan
}
