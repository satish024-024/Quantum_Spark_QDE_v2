# 3D Quantum Circuit Visualizer Startup Script
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  3D Quantum Circuit Visualizer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if server is already running
$portCheck = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($portCheck) {
    Write-Host "Server is already running on port 3000" -ForegroundColor Green
    Write-Host "Opening browser..." -ForegroundColor Yellow
    Start-Process "http://localhost:3000"
} else {
    Write-Host "Starting server on port 3000..." -ForegroundColor Yellow
    Write-Host "Application will be available at: http://localhost:3000" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Red
    Write-Host ""
    npx http-server -p 3000
}
