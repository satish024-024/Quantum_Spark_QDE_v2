#!/usr/bin/env pwsh
# Quantum API Testing Suite - PowerShell Version

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    QUANTUM API TESTING SUITE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is available
Write-Host "Checking if Python is available..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $pythonVersion found" -ForegroundColor Green
    } else {
        throw "Python not found"
    }
} catch {
    Write-Host "❌ ERROR: Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python and try again" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Available test options:" -ForegroundColor White
Write-Host "1. Quick API Check (fast, basic test)" -ForegroundColor Gray
Write-Host "2. Comprehensive API Test (detailed, all endpoints)" -ForegroundColor Gray
Write-Host "3. Run both tests" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Enter your choice (1, 2, or 3)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Running Quick API Check..." -ForegroundColor Green
        Write-Host "============================" -ForegroundColor Green
        python quick_api_check.py
    }
    "2" {
        Write-Host ""
        Write-Host "Running Comprehensive API Test..." -ForegroundColor Green
        Write-Host "===================================" -ForegroundColor Green
        python comprehensive_api_test.py
    }
    "3" {
        Write-Host ""
        Write-Host "Running Quick API Check..." -ForegroundColor Green
        Write-Host "============================" -ForegroundColor Green
        python quick_api_check.py
        Write-Host ""
        Write-Host ""
        Write-Host "Running Comprehensive API Test..." -ForegroundColor Green
        Write-Host "===================================" -ForegroundColor Green
        python comprehensive_api_test.py
    }
    default {
        Write-Host "Invalid choice. Please run the script again and choose 1, 2, or 3." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing completed!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Read-Host "Press Enter to exit"

