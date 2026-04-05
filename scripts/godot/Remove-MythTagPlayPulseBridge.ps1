param(
    [string]$MythTagPath = "C:\Users\alex1\GameDev\MythTag",
    [switch]$RemoveAddon
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $MythTagPath)) {
    throw "MythTag path does not exist: $MythTagPath"
}

$projectFile = Join-Path $MythTagPath "project.godot"
$bridgeDir = Join-Path $MythTagPath "Project\Autoload\PlayPulseBridge"

if (Test-Path $projectFile) {
    $content = Get-Content -LiteralPath $projectFile |
        Where-Object { $_ -notmatch '^PlayPulse=' -and $_ -notmatch '^PlayPulseMythTagBridge=' }
    Set-Content -LiteralPath $projectFile -Value $content
}

if (Test-Path $bridgeDir) {
    Remove-Item -LiteralPath $bridgeDir -Recurse -Force
}

if ($RemoveAddon) {
    foreach ($addonsDir in @("Addons", "addons")) {
        $addonPath = Join-Path $MythTagPath "$addonsDir\playpulse"
        if (Test-Path $addonPath) {
            Remove-Item -LiteralPath $addonPath -Recurse -Force
        }
    }
}

Write-Host "Removed PlayPulse bridge from MythTag"
