# restore-covgate-git.ps1
#
# Restores the real git history for every covgate family folder in
# TypeScript-Tools-Invalid. The device-bridge transfer that copied this
# corpus to your machine cannot carry ".git" directories, so covgate's
# six independent git repos (root, node12, node14, node20, node24, node26 -
# each with a "main" branch = tested baseline and a "feature" branch =
# HEAD with untested additions) were packed into .tar.gz bundles instead
# and sent alongside the corpus in a "_git-bundles" folder. This script
# unpacks each bundle into the matching folder's .git directory.
#
# Usage: open PowerShell, cd into the TypeScript-Tools-Invalid folder
# (the one containing "covgate" and "_git-bundles"), then run:
#   .\restore-covgate-git.ps1
#
# Requires Windows 10/11's built-in tar.exe (bsdtar), which ships by
# default - no extra install needed.

$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }

$bundleDir = Join-Path $root "_git-bundles"
$covgateDir = Join-Path $root "covgate"

if (-not (Test-Path $bundleDir)) {
    Write-Error "Could not find '_git-bundles' folder next to this script. Run this script from the TypeScript-Tools-Invalid folder."
    exit 1
}
if (-not (Test-Path $covgateDir)) {
    Write-Error "Could not find 'covgate' folder next to this script. Run this script from the TypeScript-Tools-Invalid folder."
    exit 1
}

$families = @(
    @{ Name = "root";   Path = $covgateDir },
    @{ Name = "node12"; Path = Join-Path $covgateDir "node12" },
    @{ Name = "node14"; Path = Join-Path $covgateDir "node14" },
    @{ Name = "node20"; Path = Join-Path $covgateDir "node20" },
    @{ Name = "node24"; Path = Join-Path $covgateDir "node24" },
    @{ Name = "node26"; Path = Join-Path $covgateDir "node26" }
)

$okCount = 0
$failCount = 0

foreach ($fam in $families) {
    $name = $fam.Name
    $target = $fam.Path
    $bundle = Join-Path $bundleDir "covgate-$name-gitdata.tar.gz"

    Write-Host "== covgate ($name) ==" -ForegroundColor Cyan

    if (-not (Test-Path $bundle)) {
        Write-Warning "  Bundle not found: $bundle - skipping."
        $failCount++
        continue
    }
    if (-not (Test-Path $target)) {
        Write-Warning "  Target folder not found: $target - skipping."
        $failCount++
        continue
    }

    $existingGit = Join-Path $target ".git"
    if (Test-Path $existingGit) {
        Write-Host "  Removing existing .git at $existingGit"
        Remove-Item -Recurse -Force $existingGit
    }

    Write-Host "  Extracting $bundle -> $target"
    tar -xzf $bundle -C $target

    if (Test-Path $existingGit) {
        Write-Host "  OK - .git restored" -ForegroundColor Green
        $okCount++
    } else {
        Write-Warning "  Extraction did not produce a .git folder - check manually."
        $failCount++
    }
}

Write-Host ""
Write-Host "Done. $okCount of $($families.Count) covgate repos restored." -ForegroundColor Cyan
if ($failCount -gt 0) {
    Write-Warning "$failCount repo(s) need manual attention - see warnings above."
}

Write-Host ""
Write-Host "Verify with, e.g.:" -ForegroundColor Yellow
Write-Host "  cd covgate\node12; git log --all --oneline --graph; git branch -a"
