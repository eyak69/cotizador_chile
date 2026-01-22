@echo off
setlocal

echo ==============================================
echo   GENERADOR DE IMAGEN DOCKER PARA LINUX
echo ==============================================
echo.

cd ..

echo 1. Construyendo imagen para arquitectura Linux (AMD64)...
echo    Esto puede tardar unos minutos...
docker build --platform linux/amd64 -t cotizador-app:latest .

if %errorlevel% neq 0 (
    echo [ERROR] Falló la construcción de la imagen.
    pause
    exit /b %errorlevel%
)

echo.
echo 2. Guardando imagen en archivo 'cotizador_image.tar'...
docker save -o cotizador_image.tar cotizador-app:latest

if %errorlevel% neq 0 (
    echo [ERROR] Falló al guardar el archivo .tar.
    pause
    exit /b %errorlevel%
)

echo.
echo ==============================================
echo   PROCESO COMPLETADO EXITOSAMENTE
echo ==============================================
echo.
echo Archivos generados en la carpeta raiz del proyecto:
echo  - cotizador_image.tar  (Imagen Docker)
echo.
echo Archivos necesarios para subir al sevidor Linux:
echo  1. cotizador_image.tar
echo  2. scripts/docker-compose.prod.yml
echo  3. scripts/instalar_en_linux.sh
echo  4. .env  (No olvides tu archivo de claves!)
echo.
pause
