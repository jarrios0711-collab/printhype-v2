@echo off
title PrintHype Printer Proxy
echo.
echo ============================================
echo   PrintHype Printer Proxy
echo   Puerto: 3001
echo   Conecta el navegador a tus impresoras 3D
echo ============================================
echo.
cd /d "%~dp0"
node scripts\printer-proxy.js
pause
