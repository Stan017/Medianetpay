@echo off
color 0B
title MediaNetPay — Metro Bundler :8081
cd /d %~dp0app-mobile
echo [Metro] Iniciando bundler en http://192.168.1.6:8081 ...
echo.
echo  En el celular: sacude el telefono -> "Configure Bundler"
echo  Ingresa:  192.168.1.6:8081
echo.
npx expo start --dev-client --lan --port 8081
pause
