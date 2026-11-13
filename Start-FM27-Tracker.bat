@echo off
if not exist "%~dp0bin\FM27-Tracker.exe" (
    echo FM27 Tracker launcher is missing. Extract the full Windows ZIP or run Setup again.
    pause
    exit /b 1
)
start "" "%~dp0bin\FM27-Tracker.exe"
