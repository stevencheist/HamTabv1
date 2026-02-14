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

# --- Port validation helper ---
function Validate-Port {
    param([string]$Value, [int]$Default)
    if ($Value -eq '') { return $Default }
    $n = 0
    if (-not [int]::TryParse($Value, [ref]$n) -or $n -lt 1 -or $n -gt 65535) {
        Write-Host "Invalid port: $Value (must be 1-65535). Using default $Default." -ForegroundColor Yellow
        return $Default
    }
    if ($n -lt 1024) {
        Write-Host "  Warning: port $n < 1024 may require elevated privileges." -ForegroundColor Yellow
    }
    return $n
}

# --- .env setup ---
$EnvFile = Join-Path $RepoRoot ".env"
if (-not (Test-Path $EnvFile)) {
    Write-Host "--- Port Configuration ---"
    $HttpPortInput = Read-Host "HTTP port [3000]"
    $HttpPort = Validate-Port $HttpPortInput 3000

    $TlsPortInput = Read-Host "HTTPS port [3443]"
    $TlsPort = Validate-Port $TlsPortInput 3443

    Write-Host ""
    $WuChoice = Read-Host "Use Weather Underground for weather data? [y/N]"
    $WuKey = ''
    if ($WuChoice -match '^[Yy]') {
        $WuKey = Read-Host "Enter your WU API key (or press Enter to add later)"
    }

    # Write .env with port and API key settings
    @(
        "PORT=$HttpPort"
        "HTTPS_PORT=$TlsPort"
        "WU_API_KEY=$WuKey"
    ) | Set-Content $EnvFile -Encoding UTF8

    if ($WuKey) {
        Write-Host ".env created with API key."
    } else {
        Write-Host ".env created."
    }
} else {
    Write-Host "Existing .env found, keeping it."
    # Read existing port values for display
    $HttpPort = 3000
    $TlsPort = 3443
    $EnvContent = Get-Content $EnvFile -ErrorAction SilentlyContinue
    foreach ($line in $EnvContent) {
        if ($line -match '^PORT=(\d+)') { $HttpPort = [int]$Matches[1] }
        if ($line -match '^HTTPS_PORT=(\d+)') { $TlsPort = [int]$Matches[1] }
    }
    Write-Host "  HTTP port:  $HttpPort"
    Write-Host "  HTTPS port: $TlsPort"
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

# Graceful stop — send Ctrl+C, then WM_CLOSE, then WM_QUIT before force-kill
& $NssmExe set $ServiceName AppStopMethodConsole 5000
& $NssmExe set $ServiceName AppStopMethodWindow 5000
& $NssmExe set $ServiceName AppStopMethodThreads 10000

# Auto-restart on any exit with 5s delay (covers update restarts and crashes)
& $NssmExe set $ServiceName AppExit Default Restart
& $NssmExe set $ServiceName AppRestartDelay 5000

# --- Start the service ---
Write-Host "Starting $ServiceName ..."
& $NssmExe start $ServiceName

Write-Host ""
Write-Host "==================================="
Write-Host "  Install complete!"
Write-Host "==================================="
Write-Host ""
Write-Host "  HTTP:   http://localhost:$HttpPort"
Write-Host "  HTTPS:  https://localhost:$TlsPort"
Write-Host "  Logs:   $LogFile"
Write-Host ""
Write-Host "  Management commands:"
Write-Host "    .\tools\nssm\nssm.exe stop $ServiceName"
Write-Host "    .\tools\nssm\nssm.exe start $ServiceName"
Write-Host "    .\tools\nssm\nssm.exe restart $ServiceName"
Write-Host "    .\tools\nssm\nssm.exe status $ServiceName"
Write-Host ""
Write-Host "  Uninstall:"
Write-Host "    powershell -ExecutionPolicy Bypass -File uninstall.ps1"
Write-Host ""
