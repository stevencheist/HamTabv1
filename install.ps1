# HamTab — Windows install script
# Usage: powershell -ExecutionPolicy Bypass -File install.ps1
# Must be run as Administrator

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# --- Require Administrator ---
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "This script must be run as Administrator." -ForegroundColor Red
    Write-Host "  Right-click PowerShell -> Run as Administrator, then re-run this script."
    exit 1
}

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ServiceName = "HamTab"
$NssmDir = Join-Path $RepoRoot "tools\nssm"
$NssmExe = Join-Path $NssmDir "nssm.exe"
$LogDir = Join-Path $RepoRoot "logs"

Write-Host "==================================="
Write-Host "  HamTab Windows Installer"
Write-Host "==================================="
Write-Host ""
Write-Host "  Install dir:  $RepoRoot"
Write-Host ""

# --- Check for Node.js ---
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js not found. Install it from https://nodejs.org/ or run:" -ForegroundColor Red
    Write-Host "  winget install OpenJS.NodeJS.LTS"
    exit 1
}

$NodeVer = node --version
Write-Host "Node.js $NodeVer found."
Write-Host ""

# --- Download NSSM if needed ---
if (-not (Test-Path $NssmExe)) {
    Write-Host "Downloading NSSM ..."
    $NssmZip = Join-Path $env:TEMP "nssm-2.24.zip"
    Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-2.24.zip" -OutFile $NssmZip -UseBasicParsing

    Write-Host "Extracting NSSM ..."
    $ExtractDir = Join-Path $env:TEMP "nssm-extract"
    if (Test-Path $ExtractDir) { Remove-Item $ExtractDir -Recurse -Force }
    Expand-Archive -Path $NssmZip -DestinationPath $ExtractDir

    # Copy the correct architecture binary
    New-Item -ItemType Directory -Path $NssmDir -Force | Out-Null
    $Arch = if ([Environment]::Is64BitOperatingSystem) { "win64" } else { "win32" }
    Copy-Item (Join-Path $ExtractDir "nssm-2.24\$Arch\nssm.exe") $NssmExe

    # Clean up
    Remove-Item $NssmZip -Force -ErrorAction SilentlyContinue
    Remove-Item $ExtractDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "NSSM installed to $NssmExe"
} else {
    Write-Host "NSSM already present at $NssmExe"
}
Write-Host ""

# --- .env setup ---
$EnvFile = Join-Path $RepoRoot ".env"
if (-not (Test-Path $EnvFile)) {
    $WuChoice = Read-Host "Use Weather Underground for weather data? [y/N]"
    if ($WuChoice -match '^[Yy]') {
        $WuKey = Read-Host "Enter your WU API key (or press Enter to add later)"
        "WU_API_KEY=$WuKey" | Set-Content $EnvFile -Encoding UTF8
        if ($WuKey) {
            Write-Host ".env created with API key."
        } else {
            Write-Host ".env created. Add your key later in $EnvFile"
        }
    } else {
        "WU_API_KEY=" | Set-Content $EnvFile -Encoding UTF8
        Write-Host ".env created (WU disabled)."
    }
} else {
    Write-Host "Existing .env found, keeping it."
}
Write-Host ""

# --- Install dependencies and build ---
Write-Host "Installing npm dependencies ..."
Push-Location $RepoRoot
try {
    npm install
    Write-Host "Building client ..."
    npm run build
} finally {
    Pop-Location
}
Write-Host ""

# --- Create logs directory ---
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# --- Remove existing service if present ---
$ExistingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($ExistingService) {
    Write-Host "Removing existing $ServiceName service ..."
    & $NssmExe stop $ServiceName 2>$null
    & $NssmExe remove $ServiceName confirm
}

# --- Register service via NSSM ---
Write-Host "Registering $ServiceName service ..."
$NodeExe = (Get-Command node).Source
$LogFile = Join-Path $LogDir "hamtab.log"

& $NssmExe install $ServiceName $NodeExe
& $NssmExe set $ServiceName AppParameters "server.js"
& $NssmExe set $ServiceName AppDirectory $RepoRoot
& $NssmExe set $ServiceName AppStdout $LogFile
& $NssmExe set $ServiceName AppStderr $LogFile
& $NssmExe set $ServiceName AppStdoutCreationDisposition 4
& $NssmExe set $ServiceName AppStderrCreationDisposition 4
& $NssmExe set $ServiceName Start SERVICE_AUTO_START
& $NssmExe set $ServiceName Description "HamTab POTA/SOTA Dashboard"

# --- Start the service ---
Write-Host "Starting $ServiceName ..."
& $NssmExe start $ServiceName

Write-Host ""
Write-Host "==================================="
Write-Host "  Install complete!"
Write-Host "==================================="
Write-Host ""
Write-Host "  HamTab is running at http://localhost:3000"
Write-Host "  Logs: $LogFile"
Write-Host ""
Write-Host "  Management commands:"
Write-Host "    .\tools\nssm\nssm.exe stop $ServiceName"
Write-Host "    .\tools\nssm\nssm.exe start $ServiceName"
Write-Host "    .\tools\nssm\nssm.exe restart $ServiceName"
Write-Host "    .\tools\nssm\nssm.exe status $ServiceName"
Write-Host ""
Write-Host "  Uninstall:"
Write-Host "    .\tools\nssm\nssm.exe remove $ServiceName confirm"
Write-Host ""
