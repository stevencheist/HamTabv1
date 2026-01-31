# setup-portproxy.ps1 — Configure Windows port forwarding for WSL2 NAT mode
# Run as Administrator from PowerShell:
#   powershell -ExecutionPolicy Bypass -File .\setup-portproxy.ps1

#Requires -RunAsAdministrator

$ErrorActionPreference = 'Stop'

# Get the WSL2 IP address
$wslIp = (wsl hostname -I).Trim().Split(' ')[0]
if (-not $wslIp) {
    Write-Error "Could not determine WSL2 IP address. Is WSL running?"
    exit 1
}

Write-Host "WSL2 IP: $wslIp" -ForegroundColor Cyan

$ports = @(3000, 3443)

# Clear existing portproxy rules for these ports
foreach ($port in $ports) {
    netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0 2>$null
    Write-Host "Cleared old portproxy for port $port"
}

# Add new portproxy rules
foreach ($port in $ports) {
    netsh interface portproxy add v4tov4 listenport=$port listenaddress=0.0.0.0 connectport=$port connectaddress=$wslIp
    Write-Host "Added portproxy: 0.0.0.0:$port -> ${wslIp}:$port" -ForegroundColor Green
}

# Ensure firewall rule exists (single rule covers both ports)
$ruleName = "HamTab WSL2"
$existing = netsh advfirewall firewall show rule name="$ruleName" 2>$null
if ($LASTEXITCODE -ne 0) {
    netsh advfirewall firewall add rule name="$ruleName" dir=in action=allow protocol=TCP localport="3000,3443"
    Write-Host "Added firewall rule: $ruleName" -ForegroundColor Green
} else {
    Write-Host "Firewall rule '$ruleName' already exists" -ForegroundColor Yellow
}

# Show current portproxy rules
Write-Host "`nCurrent portproxy rules:" -ForegroundColor Cyan
netsh interface portproxy show v4tov4
