@echo off
color 0B
title MediaNetPay — Mock MediaNet :9000
cd /d %~dp0
echo [Mock MediaNet] Iniciando en http://localhost:9000 ...
echo.
C:\Users\stanley\AppData\Local\Microsoft\WindowsApps\python.exe mock_medianet/server.py
pause
