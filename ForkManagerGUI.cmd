@echo off
rem Opens the NX Fork Manager GUI.
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is required to run the NX Fork Manager GUI.
    echo Please install Node.js (v18 or newer) from https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules\electron" (
    echo [SETUP] Installing required dependencies (first run only)...
    call npm install --no-audit --no-fund
)

if exist "node_modules\electron\dist\electron.exe" (
    start "" "node_modules\electron\dist\electron.exe" .
) else (
    start "" npx electron .
)
