@echo off
echo Starting 3D Quantum Circuit Visualizer...
echo.
echo Checking if server is already running...
netstat -an | findstr :3000 >nul
if %errorlevel% == 0 (
    echo Server is already running on port 3000
    echo Opening browser...
    start http://localhost:3000
) else (
    echo Starting server on port 3000...
    npx http-server -p 3000
)
echo.
echo Application should be available at: http://localhost:3000
echo Press Ctrl+C to stop the server
pause
