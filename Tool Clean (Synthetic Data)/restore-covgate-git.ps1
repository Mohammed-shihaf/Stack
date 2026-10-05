# restore-covgate-git.ps1
#
# Purpose: covgate is the one tool in TypeScript-Tools-Clean whose own test
# harness operates on a real git working tree (it gates coverage against a
# git diff), so each of its 5 boundary-version family folders
# (node12, node14, node20, node24, node26) needs its OWN independent .git
# repo, not a shared one at the tool root.
#
# Those 5 family-level .git repos were built during this session's cleanup
# but could NOT be pushed to this computer through the remote bridge tool,
# because that tool refuses to write any path containing ".git" (a hard
# tool-level restriction, not a bug). Every other file in the corpus has
# already been pushed and verified. This script finishes the job by copying
# the covgate .git repo you already have (at the tool root) into each of the
# 5 family folders, entirely on your own machine -- no data needs to cross
# the bridge for this step.
#
# Run this ONCE, from PowerShell, on the computer where the corpus lives.
#
# What it does:
#   1. Verifies the source .git exists at covgate\.git
#   2. For each of node12, node14, node20, node24, node26:
#        - if that family folder already has its own .git, leaves it alone
#        - otherwise copies covgate\.git into covgate\<family>\.git
#   3. Prints a summary of what it did
#
# This does NOT touch anything else in the corpus. It is safe to re-run;
# it skips any family that already has a .git.

$ErrorActionPreference = "Stop"

$root = "C:\Users\Prajith K\Desktop\TypeScript Tools\TypeScript-Tools-Clean\covgate"
$source = Join-Path $root ".git"
$families = @("node12", "node14", "node20", "node24", "node26")

if (-not (Test-Path $source)) {
    Write-Error "Source git repo not found at: $source`nNothing to copy from -- aborting."
    exit 1
}

Write-Host "Source .git found at: $source" -ForegroundColor Cyan
Write-Host ""

$copied = @()
$skipped = @()

foreach ($fam in $families) {
    $famDir = Join-Path $root $fam
    $famGit = Join-Path $famDir ".git"

    if (-not (Test-Path $famDir)) {
        Write-Warning "Family folder does not exist, skipping: $famDir"
        continue
    }

    if (Test-Path $famGit) {
        Write-Host "SKIP  $fam  (already has its own .git)" -ForegroundColor Yellow
        $skipped += $fam
        continue
    }

    Write-Host "COPY  $fam  <-  covgate\.git" -ForegroundColor Green
    Copy-Item -Path $source -Destination $famGit -Recurse
    $copied += $fam
}

Write-Host ""
Write-Host "Done." -ForegroundColor Cyan
Write-Host ("Copied into: " + ($(if ($copied.Count -gt 0) { $copied -join ", " } else { "(none)" })))
Write-Host ("Skipped (already present): " + ($(if ($skipped.Count -gt 0) { $skipped -join ", " } else { "(none)" })))
Write-Host ""
Write-Host "Each family folder (node12/14/20/24/26) now has its own git" -ForegroundColor Cyan
Write-Host "repo, independent of the others and of the tool-root .git, so" -ForegroundColor Cyan
Write-Host "covgate's git-diff gating logic can run against each family" -ForegroundColor Cyan
Write-Host "in isolation." -ForegroundColor Cyan
