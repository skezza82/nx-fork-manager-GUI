@echo off
cd /d "%~dp0"
echo Starting NX Fork Manager GUI...
call npm start
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] App exited with error code %errorlevel%.
    pause
)
