# Start wrapper — runs node server.js in a restart loop.
# Clean exit (code 0) restarts after 1s; crash restarts after 3s.

Set-Location $PSScriptRoot

while ($true) {
    Write-Host "=== Starting server ==="
    node server.js
    $exitCode = $LASTEXITCODE
    if ($exitCode -eq 0) {
        Write-Host "Server exited cleanly (code 0). Restarting in 1s..."
        Start-Sleep -Seconds 1
    } else {
        Write-Host "Server crashed (code $exitCode). Restarting in 3s..."
        Start-Sleep -Seconds 3
    }
}
