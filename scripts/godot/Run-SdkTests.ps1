param(
    [string]$GodotExecutable = "C:\Users\alex1\OneDrive\Desktop\Godot_v4.4.1-stable_win64_console.exe"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$sourceProjectPath = Join-Path $repoRoot "sdk\godot\test_project"
$runtimeProjectPath = Join-Path $env:TEMP ("playpulse-godot-test-project-" + [guid]::NewGuid().ToString("N"))

New-Item -ItemType Directory -Path $runtimeProjectPath -Force | Out-Null
Copy-Item -Path (Join-Path $sourceProjectPath "*") -Destination $runtimeProjectPath -Recurse -Force

& (Join-Path $PSScriptRoot "Sync-PlayPulseAddon.ps1") -TargetProjectPath $runtimeProjectPath

& $GodotExecutable --headless --path $runtimeProjectPath
exit $LASTEXITCODE
