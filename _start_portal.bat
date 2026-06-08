@echo off
color 0D
title MediaNetPay — Portal :3001
cd /d %~dp0\portal
echo [Portal] Iniciando en http://localhost:3001 ...
echo.
npm run dev
pause
