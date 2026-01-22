#!/bin/bash

echo "=========================================="
echo "   INSTALADOR DE COTIZADOR EN LINUX"
echo "=========================================="

# 1. Verificar si existe el archivo de imagen
if [ -f "cotizador_image.tar" ]; then
    echo "[1/3] Cargando imagen Docker desde archivo..."
    docker load -i cotizador_image.tar
else
    echo "[ERROR] No se encuentra 'cotizador_image.tar'. Sube el archivo primero."
    exit 1
fi

# 2. Verificar archivo env
if [ ! -f ".env" ]; then
    echo "[WARNING] No se encontró archivo '.env'. Asegúrate de crearlo con tus claves API."
    read -p "Presiona ENTER para continuar bajo tu riesgo o Ctrl+C para cancelar..."
fi

# 3. Levantar servicios
echo "[2/3] Deteniendo servicios anteriores..."
docker compose -f docker-compose.prod.yml down

echo "[3/3] Iniciando servicios con configuración de producción..."
docker compose -f docker-compose.prod.yml up -d

echo.
echo "=========================================="
echo "   ¡DESPLIEGUE FINALIZADO!"
echo "=========================================="
echo "Verifica los logs con: docker compose -f docker-compose.prod.yml logs -f"
