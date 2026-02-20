@echo off
:: Asegurar que estamos en la raíz del proyecto
cd /d "%~dp0.."

:: --- CONFIGURACIÓN ---
set DOCKER_USER=cfanton
set IMAGE_NAME=cotizador-chile
:: Etiqueta específica para evitar sobreescribir 'latest' que está en prod
set TAG=coolify
:: ---------------------

:: Obtener rama actual
for /f "tokens=*" %%i in ('git branch --show-current') do set BRANCH=%%i

:: Advertencia Visual
color 1F
cls
echo.
echo ==============================================================================
echo.
echo      DEPLOYING COOLIFY SPECIFIC IMAGE !!!    (Branch: %BRANCH%)
echo      TAG: %TAG%
echo.
echo ==============================================================================
echo.

echo 🐳 Logging into Docker Hub...
docker login

echo.
echo 🏗️  Building Image (Linux/AMD64)...
:: Construimos UNA sola imagen etiquetada para Coolify
docker build --platform linux/amd64 -t %DOCKER_USER%/%IMAGE_NAME%:%TAG% .

if %errorlevel% neq 0 (
    echo [ERROR] Build failed.
    pause
    exit /b %errorlevel%
)

echo.
echo ⬆️  Pushing Image to Docker Hub...
docker push %DOCKER_USER%/%IMAGE_NAME%:%TAG%

if %errorlevel% neq 0 (
    echo [ERROR] Push failed.
    pause
    exit /b %errorlevel%
)

echo.
echo ======================================================
echo  ✅ DEPLOY COMPLETED TO DOCKER HUB (TAG: %TAG%)
echo ======================================================
echo.
echo  Next steps on Coolify:
echo   1. Image to use: %DOCKER_USER%/%IMAGE_NAME%:%TAG%
echo   2. Use docker-compose.coolify.yml configuration
echo.
pause
