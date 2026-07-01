@echo off
echo ========================================
echo    QUANTUM API TESTING SUITE
echo ========================================
echo.

echo Checking if Python is available...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python and try again
    pause
    exit /b 1
)

echo.
echo Available test options:
echo 1. Quick API Check (fast, basic test)
echo 2. Comprehensive API Test (detailed, all endpoints)
echo 3. Run both tests
echo.

set /p choice="Enter your choice (1, 2, or 3): "

if "%choice%"=="1" (
    echo.
    echo Running Quick API Check...
    echo ============================
    python quick_api_check.py
) else if "%choice%"=="2" (
    echo.
    echo Running Comprehensive API Test...
    echo ===================================
    python comprehensive_api_test.py
) else if "%choice%"=="3" (
    echo.
    echo Running Quick API Check...
    echo ============================
    python quick_api_check.py
    echo.
    echo.
    echo Running Comprehensive API Test...
    echo ===================================
    python comprehensive_api_test.py
) else (
    echo Invalid choice. Please run the script again and choose 1, 2, or 3.
)

echo.
echo ========================================
echo Testing completed!
echo ========================================
pause

