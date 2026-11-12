@echo off
title FM27 Thai Progression Tracker & Scout
chcp 65001 > nul
cls

echo ========================================================
echo    ⚽ FM27 Thai Progression Tracker & Scout Tool
echo ========================================================
echo กำลังเปิดระบบและเชื่อมต่อกับ FM27...
echo.

start "" "http://localhost:3000"
node "%~dp0server\index.js"

pause
