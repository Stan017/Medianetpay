@echo off
:: ─────────────────────────────────────────────────────────────────────────────
:: _set_api_url.bat — Actualiza la URL del backend en la app móvil
::
:: Uso: _set_api_url.bat https://medianetpay-api-xxxx.a.run.app
::
:: Qué hace:
::   1. Actualiza apiBaseUrl en app-mobile/app.json
::   2. Actualiza API_BASE_URL en .env
::   3. Recuerda hacer rebuild del APK
:: ─────────────────────────────────────────────────────────────────────────────
color 0E
title MediaNetPay — Actualizar URL del servidor

if "%1"=="" (
    echo.
    echo  ERROR: Debes pasar la URL como parametro.
    echo  Uso: _set_api_url.bat https://tu-url.a.run.app
    echo.
    pause
    exit /b 1
)

set NEW_URL=%1

echo.
echo  Actualizando URL del backend a: %NEW_URL%
echo.

:: Actualizar app.json con PowerShell (maneja JSON correctamente)
powershell -Command " $json = Get-Content 'app-mobile\app.json' -Raw | ConvertFrom-Json; $json.expo.extra.apiBaseUrl = '%NEW_URL%'; $json | ConvertTo-Json -Depth 10 | Set-Content 'app-mobile\app.json' -Encoding UTF8"

:: Actualizar .env
powershell -Command "(Get-Content '.env') -replace 'API_BASE_URL=.*', 'API_BASE_URL=%NEW_URL%' | Set-Content '.env'"

echo  [OK] app-mobile\app.json actualizado
echo  [OK] .env actualizado
echo.
echo  ─────────────────────────────────────────────────────────
echo  Siguiente paso: rebuild del APK
echo    1. Ejecutar: _build_apk.bat
echo    O manualmente:
echo    cd app-mobile\android
echo    gradlew.bat assembleDebug
echo  ─────────────────────────────────────────────────────────
echo.
pause
