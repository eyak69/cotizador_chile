@echo off
title Cotizador Inteligente - Iniciando...
color 0A

echo ========================================================
echo      INICIANDO COTIZADOR INTELIGENTE
echo ========================================================
echo.

:: Verificar si Docker está corriendo
docker info >nul 2>&1
if %errorlevel% neq 0 (
    color 4F
    echo [ERROR] DOCKER NO ESTA CORRIENDO.
    echo Por favor, abra "Docker Desktop" primero y espere a que inicie.
    echo.
    pause
    exit
)

echo 1. Descargando ultima version...
docker compose pull

echo.
echo 2. Iniciando sistema...
docker compose up -d

echo.
echo ========================================================
echo      SISTEMA LISTO!
echo ========================================================
echo.
echo La aplicacion esta disponible en:
echo    http://localhost:3001
echo.
echo Abriendo navegador...
timeout /t 3 >nul
start http://localhost:3001

echo.
echo Presione cualquier tecla solo si desea DETENER el sistema.
pause

echo Deteniendo...
docker compose down
