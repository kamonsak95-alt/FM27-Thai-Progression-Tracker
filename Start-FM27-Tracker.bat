@echo off
title FM27 Thai Progression Tracker & Scout
chcp 65001 > nul
cls

echo ========================================================
echo    ⚽ FM27 Thai Progression Tracker & Scout Tool
echo ========================================================
echo กำลังตรวจสอบอัปเดตและเริ่มต้นระบบ...
echo.

:: Check and pull latest GitHub updates silently before launch
node "%~dp0server\prelaunch.js"

:: Start the background Node server
start /b "" node "%~dp0server\index.js"

:: Wait 1 second for the server to bind
timeout /t 1 /nobreak > nul

:: Open as a Standalone Desktop Application Window (Chromeless App Mode)
set EDGE_EXE="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not exist %EDGE_EXE% set EDGE_EXE="C:\Program Files\Microsoft\Edge\Application\msedge.exe"

if exist %EDGE_EXE% (
    start "" %EDGE_EXE% --app="http://localhost:3000" --window-size=1440,900 --no-first-run
) else (
    start "" "http://localhost:3000"
)

echo โปรแกรมพร้อมใช้งานแล้ว (เปิดในหน้าต่างเดสก์ท็อป)
echo *สามารถปิดหน้าต่างดำนี้ได้เมื่อเลิกใช้งานโปรแกรม*
