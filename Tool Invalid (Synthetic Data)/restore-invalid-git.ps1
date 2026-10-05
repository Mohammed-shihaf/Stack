# Restores real .git history for diff-cover, dulwich and pydriller from _git-bundles/
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$tools = @("diff-cover", "dulwich", "pydriller")
foreach ($tool in $tools) {
    $bundleFile = Join-Path $here "_git-bundles\$tool-gitdata.tar.gz"
    $toolPath   = Join-Path $here $tool
    if ((Test-Path $bundleFile) -and (Test-Path $toolPath)) {
        tar -xzf $bundleFile -C $toolPath
        Write-Host "Restored .git for $tool" -ForegroundColor Green
    }
}
