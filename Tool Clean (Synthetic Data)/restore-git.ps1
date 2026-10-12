# Restores real .git history for covgate (root + per-node-version) and diff-cover / pydriller from _git-bundles/
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$map = [ordered]@{
    "covgate"        = "covgate-root"
    "covgate\node12" = "covgate-node12"
    "covgate\node14" = "covgate-node14"
    "covgate\node20" = "covgate-node20"
    "covgate\node24" = "covgate-node24"
    "covgate\node26" = "covgate-node26"
    "diff-cover"     = "diff-cover"
    "pydriller"      = "pydriller"
}
foreach ($rel in $map.Keys) {
    $bundleFile = Join-Path $here "_git-bundles\$($map[$rel])-gitdata.tar.gz"
    $toolPath   = Join-Path $here $rel
    if ((Test-Path $bundleFile) -and (Test-Path $toolPath)) {
        tar -xzf $bundleFile -C $toolPath
        Write-Host "Restored .git for $rel" -ForegroundColor Green
    }
}
