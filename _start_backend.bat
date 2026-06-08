@echo off
color 0E
title MediaNetPay — Backend API :8000
cd /d %~dp0
echo [Backend] Iniciando en http://localhost:8000 ...
echo.
C:\Users\stanley\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.10_qbz5n2kfra8p0\LocalCache\local-packages\Python310\Scripts\uvicorn.exe app.main:app --reload --host 0.0.0.0 --port 8000
pause
