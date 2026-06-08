@echo off
title MediaNetPay — Iniciando...
color 0A

set ROOT=%~dp0

echo.
echo  ============================================
echo    MediaNetPay — Ambiente de Desarrollo
echo  ============================================
echo.
echo  [1/4] Mock MediaNet  (puerto 9000)...
start "Mock" cmd /k "%ROOT%_start_mock.bat"
timeout /t 2 /nobreak >nul

echo  [2/4] Backend FastAPI (puerto 8000)...
start "Backend" cmd /k "%ROOT%_start_backend.bat"
timeout /t 3 /nobreak >nul

echo  [3/4] Portal Next.js  (puerto 3001)...
start "Portal" cmd /k "%ROOT%_start_portal.bat"
timeout /t 2 /nobreak >nul

echo  [4/4] Metro Bundler   (puerto 8081)...
start "Metro" cmd /k "%ROOT%_start_metro.bat"

echo.
echo  Abriendo navegador en 8 segundos...
timeout /t 8 /nobreak >nul
start "" "http://localhost:3001"
start "" "http://localhost:8000/docs"

echo.
echo  ============================================
echo   CELULAR: sacude el telefono
echo   -> Configure Bundler -> 192.168.1.6:8081
echo   Cambios de JS = recarga instantanea
echo   Solo reinstalar APK si agregas modulos nativos
echo  ============================================
echo.
echo  Cierra las ventanas para detener todo.
pause
