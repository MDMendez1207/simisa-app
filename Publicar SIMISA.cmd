@echo off
rem Publica SIMISA mediante un tunel rapido de Cloudflare (URL https://*.trycloudflare.com).
rem Uso:  "Publicar SIMISA.cmd"            -> demo interactiva
rem       "Publicar SIMISA.cmd" lectura    -> demo publica en modo solo lectura (sin POST desde el tunel)
cd /d "%~dp0"
setlocal
if "%PORT%"=="" set PORT=4180

where cloudflared >nul 2>nul
if errorlevel 1 (
  echo No se encontro cloudflared. Instalalo con:
  echo   winget install --id Cloudflare.cloudflared
  echo y volve a abrir esta ventana.
  pause
  exit /b 1
)

set SIMISA_PUBLIC_HOSTS=*.trycloudflare.com
if /i "%~1"=="lectura" (set SIMISA_READONLY=1) else (set SIMISA_READONLY=0)

start "SIMISA servidor" cmd /k node server.js
timeout /t 2 /nobreak >nul

echo.
echo Busca abajo la linea "https://....trycloudflare.com": es el enlace publico.
echo Local: http://127.0.0.1:%PORT%  ^|  Cerrar esta ventana corta el tunel.
echo No cargues datos personales reales: el enlace es accesible por cualquiera que lo tenga.
echo.
cloudflared tunnel --no-autoupdate --url http://127.0.0.1:%PORT%
endlocal
pause
