# Manual update — pulls latest code and installs dependencies.

Set-Location $PSScriptRoot

Write-Host "Pulling latest changes..."
git pull
if ($LASTEXITCODE -ne 0) {
    Write-Host "git pull failed"
    exit 1
}

Write-Host "Installing dependencies..."
npm install --production
if ($LASTEXITCODE -ne 0) {
    Write-Host "npm install failed"
    exit 1
}

Write-Host "Update complete."
