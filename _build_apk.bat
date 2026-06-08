@echo off
:: ─────────────────────────────────────────────────────────────────────────────
:: _build_apk.bat — Reconstruye el APK de debug con la URL actual de app.json
:: ─────────────────────────────────────────────────────────────────────────────
color 0A
title MediaNetPay — Build APK

echo.
echo  MediaNetPay — Build APK
echo  URL del backend:
powershell -Command "((Get-Content 'app-mobile\app.json' -Raw | ConvertFrom-Json).expo.extra.apiBaseUrl)"
echo.
echo  Iniciando build... (tarda ~5 minutos)
echo.

cd /d "%~dp0app-mobile\android"
call gradlew.bat assembleDebug

if %ERRORLEVEL% EQU 0 (
    echo.
    echo  ─────────────────────────────────────────────────────────
    echo  BUILD EXITOSO
    echo  APK listo en:
    echo  app-mobile\android\app\build\outputs\apk\debug\app-debug.apk
    echo  ─────────────────────────────────────────────────────────
) else (
    echo.
    echo  ERROR en el build. Revisa los logs arriba.
)

echo.
pause
