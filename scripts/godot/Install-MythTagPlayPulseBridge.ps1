param(
    [string]$MythTagPath = "C:\Users\alex1\GameDev\MythTag",
    [string]$BridgeSourcePath = (Join-Path $PSScriptRoot "..\\..\\sdk\\godot\\mythtag\\mythtag_playpulse_bridge.gd")
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $MythTagPath)) {
    throw "MythTag path does not exist: $MythTagPath"
}

& (Join-Path $PSScriptRoot "Sync-PlayPulseAddon.ps1") -TargetProjectPath $MythTagPath

$bridgeDir = Join-Path $MythTagPath "Project\Autoload\PlayPulseBridge"
$bridgeTargetPath = Join-Path $bridgeDir "PlayPulseMythTagBridge.gd"
$projectFile = Join-Path $MythTagPath "project.godot"

New-Item -ItemType Directory -Path $bridgeDir -Force | Out-Null
Copy-Item -LiteralPath $BridgeSourcePath -Destination $bridgeTargetPath -Force

$content = Get-Content -LiteralPath $projectFile
$filtered = $content | Where-Object {
    $_ -notmatch '^PlayPulse=' -and $_ -notmatch '^PlayPulseMythTagBridge='
}

$autoloadIndex = [Array]::IndexOf($filtered, "[autoload]")
if ($autoloadIndex -lt 0) {
    $filtered += ""
    $filtered += "[autoload]"
    $autoloadIndex = [Array]::IndexOf($filtered, "[autoload]")
}

$playPulsePath = if (Test-Path (Join-Path $MythTagPath "Addons\playpulse\playpulse.gd")) {
    "res://Addons/playpulse/playpulse.gd"
} else {
    "res://addons/playpulse/playpulse.gd"
}

$insert = @(
    "PlayPulse=`"*${playPulsePath}`"",
    "PlayPulseMythTagBridge=`"*res://Project/Autoload/PlayPulseBridge/PlayPulseMythTagBridge.gd`""
)

$before = @()
$after = @()
if ($autoloadIndex -gt 0) {
    $before = $filtered[0..$autoloadIndex]
}
if ($autoloadIndex + 1 -lt $filtered.Count) {
    $after = $filtered[($autoloadIndex + 1)..($filtered.Count - 1)]
}

$updated = @($before + $insert + $after)
Set-Content -LiteralPath $projectFile -Value $updated

Write-Host "Installed PlayPulse bridge into MythTag at $bridgeTargetPath"
