@echo off
:: Asegurar que estamos en la raíz del proyecto
cd /d "%~dp0.."

:: --- CONFIGURACIÓN ---
:: He puesto 'eyak69' basándome en tu git remote. Cámbialo si tu usuario de Docker Hub es diferente.
set DOCKER_USER=cfanton
set IMAGE_NAME=cotizador-chile
:: ---------------------

:: Obtener rama actual
for /f "tokens=*" %%i in ('git branch --show-current') do set BRANCH=%%i

:: Advertencia Visual según rama
if "%BRANCH%"=="main" (
    color 4F
    cls
    echo.
    echo ==============================================================================
    echo.
    echo      WARNING: YOU ARE DEPLOYING TO PRODUCTION !!!    (Branch: %BRANCH%)
    echo.
    echo ==============================================================================
    echo.
) else (
    color 0A
    cls
    echo.
    echo ==============================================================================
    echo      Active Branch: %BRANCH%
    echo ==============================================================================
    echo.
)

echo 🐳 Logging into Docker Hub...
docker login

echo.
echo 🏗️  Building Image (Linux/AMD64)...
:: Construimos UNA sola imagen porque es monorepo (Backend sirve Frontend)
docker build --platform linux/amd64 -t %DOCKER_USER%/%IMAGE_NAME%:latest .

if %errorlevel% neq 0 (
    echo [ERROR] Build failed.
    pause
    exit /b %errorlevel%
)

echo.
echo ⬆️  Pushing Image to Docker Hub...
docker push %DOCKER_USER%/%IMAGE_NAME%:latest

if %errorlevel% neq 0 (
    echo [ERROR] Push failed.
    pause
    exit /b %errorlevel%
)

echo.
echo ======================================================
echo  ✅ DEPLOY COMPLETED TO DOCKER HUB
echo ======================================================
echo.
echo  Next steps on your Linux Server:
echo   1. Copy 'scripts/docker-compose.hub.yml' and '.env'
echo   2. Run 'scripts/update_server.sh'
echo.
pause
