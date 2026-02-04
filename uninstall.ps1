# HamTab — Windows uninstall script
# Usage: powershell -ExecutionPolicy Bypass -File uninstall.ps1
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

Write-Host "==================================="
Write-Host "  HamTab Uninstaller"
Write-Host "==================================="
Write-Host ""
Write-Host "  Install dir: $RepoRoot"
Write-Host ""

# --- Stop and remove service ---
$ExistingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($ExistingService) {
    Write-Host "Stopping $ServiceName service ..."
    if (Test-Path $NssmExe) {
        & $NssmExe stop $ServiceName 2>$null
        & $NssmExe remove $ServiceName confirm
    } else {
        # Fallback to sc.exe if NSSM binary is missing
        Write-Host "NSSM not found, using sc.exe ..." -ForegroundColor Yellow
        sc.exe stop $ServiceName 2>$null
        sc.exe delete $ServiceName
    }
    Write-Host "Service removed."
} else {
    Write-Host "No $ServiceName service found, skipping."
}
Write-Host ""

# --- Handle .env backup ---
$EnvFile = Join-Path $RepoRoot ".env"
$BackupPath = $null
if (Test-Path $EnvFile) {
    Write-Host "Your .env file contains configuration (API keys, ports)."
    $KeepEnv = Read-Host "Keep a backup of .env? [Y/n]"
    if ($KeepEnv -eq '' -or $KeepEnv -match '^[Yy]') {
        $Timestamp = Get-Date -Format "yyyyMMddHHmmss"
        $BackupPath = Join-Path $env:TEMP "hamtab-env-backup-$Timestamp"
        Copy-Item $EnvFile $BackupPath
        Write-Host "Backed up to: $BackupPath"
    } else {
        Write-Host ".env will be removed with cleanup."
    }
}
Write-Host ""

# --- Ask about NSSM removal ---
if (Test-Path $NssmDir) {
    $RemoveNssm = Read-Host "Remove NSSM tool from tools\nssm? [y/N]"
    if ($RemoveNssm -match '^[Yy]') {
        Remove-Item $NssmDir -Recurse -Force
        Write-Host "NSSM removed."
        # Remove tools dir if empty
        $ToolsDir = Join-Path $RepoRoot "tools"
        if ((Test-Path $ToolsDir) -and @(Get-ChildItem $ToolsDir).Count -eq 0) {
            Remove-Item $ToolsDir -Force
        }
    } else {
        Write-Host "Keeping NSSM."
    }
}
Write-Host ""

# --- Clean up generated directories ---
Write-Host "Cleaning up generated files ..."
$CleanDirs = @("node_modules", "logs", "certs")
foreach ($dir in $CleanDirs) {
    $dirPath = Join-Path $RepoRoot $dir
    if (Test-Path $dirPath) {
        Remove-Item $dirPath -Recurse -Force
        Write-Host "  Removed $dir"
    }
}
# Remove .env if user declined backup
if ((Test-Path $EnvFile) -and -not $BackupPath) {
    Remove-Item $EnvFile -Force
    Write-Host "  Removed .env"
}
Write-Host ""

# --- Summary ---
Write-Host "==================================="
Write-Host "  Uninstall complete"
Write-Host "==================================="
Write-Host ""
if ($BackupPath) {
    Write-Host "  .env backup: $BackupPath"
}
Write-Host "  Service:     removed"
Write-Host "  Generated dirs: cleaned"
Write-Host ""
Write-Host "  To fully remove HamTab, delete this directory:"
Write-Host "    $RepoRoot"
Write-Host ""
Write-Host "  (The script can't delete the directory it's running from.)"
Write-Host ""
