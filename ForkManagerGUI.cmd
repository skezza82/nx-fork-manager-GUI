@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is required to run the NX Fork Manager GUI.
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

if not exist "%~dp0node_modules\electron" (
    echo [SETUP] Installing required dependencies...
    call npm install --no-audit --no-fund
)

if exist "%~dp0node_modules\electron\dist\electron.exe" (
    start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0."
) else (
    start "" npx electron "%~dp0."
)
