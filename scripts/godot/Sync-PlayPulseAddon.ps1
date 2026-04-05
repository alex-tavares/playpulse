param(
    [string]$TargetProjectPath,
    [string]$SourceAddonPath = (Join-Path $PSScriptRoot "..\\..\\sdk\\godot\\playpulse\\addons\\playpulse")
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $TargetProjectPath)) {
    throw "Target project path does not exist: $TargetProjectPath"
}

if (-not (Test-Path $SourceAddonPath)) {
    throw "Source addon path does not exist: $SourceAddonPath"
}

$targetAddonsDir = if (Test-Path (Join-Path $TargetProjectPath "Addons")) {
    Join-Path $TargetProjectPath "Addons"
} else {
    Join-Path $TargetProjectPath "addons"
}

$targetAddonPath = Join-Path $targetAddonsDir "playpulse"

New-Item -ItemType Directory -Path $targetAddonsDir -Force | Out-Null

if (Test-Path $targetAddonPath) {
    Remove-Item -LiteralPath $targetAddonPath -Recurse -Force
}

Copy-Item -LiteralPath $SourceAddonPath -Destination $targetAddonPath -Recurse -Force
Write-Host "Synced PlayPulse addon to $targetAddonPath"
