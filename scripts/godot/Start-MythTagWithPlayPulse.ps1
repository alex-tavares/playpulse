param(
    [string]$MythTagPath = "C:\Users\alex1\GameDev\MythTag",
    [string]$GodotExecutable = "C:\Users\alex1\OneDrive\Desktop\Godot_v4.4.1-stable_win64.exe",
    [string]$IngestBaseUrl = "http://127.0.0.1:4001",
    [string]$ApiKey = "mythtag-local-key",
    [string]$SigningSecret = "mythtag-local-secret",
    [string]$PlayerSeed = "mythtag-local-player",
    [switch]$ConsoleSmoke
)

$ErrorActionPreference = "Stop"

& (Join-Path $PSScriptRoot "Install-MythTagPlayPulseBridge.ps1") -MythTagPath $MythTagPath

$env:PLAYPULSE_GODOT_INGEST_BASE_URL = $IngestBaseUrl
$env:PLAYPULSE_GODOT_API_KEY = $ApiKey
$env:PLAYPULSE_GODOT_SIGNING_SECRET = $SigningSecret
$env:PLAYPULSE_GODOT_PLAYER_SEED = $PlayerSeed
$env:PLAYPULSE_MYTHTAG_SMOKE_TEST = if ($ConsoleSmoke) { "1" } else { "0" }

& $GodotExecutable --path $MythTagPath
