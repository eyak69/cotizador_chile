#!/bin/bash

# Configuración
IMAGE_NAME="cfanton/cotizador-chile:latest"
COMPOSE_FILE="docker-compose.hub.yml"

echo "=========================================="
echo "   ACTUALIZADOR AUTOMÁTICO - DOCKER HUB"
echo "=========================================="

# 1. Verificar archivos necesarios
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "⚠️  No se encuentra $COMPOSE_FILE. Asegúrate de haberlo subido."
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "⚠️  No se encontró .env. Creando uno vacío (llénalo después)..."
    touch .env
fi

# 2. Descargar última versión de la imagen
echo "⬇️  Descargando última imagen ($IMAGE_NAME)..."
docker pull $IMAGE_NAME

# 3. Reiniciar contenedores
echo "🔄 Reiniciando servicios..."
docker compose -f $COMPOSE_FILE down
docker compose -f $COMPOSE_FILE up -d

# 4. Limpieza de imágenes viejas (opcional)
echo "🧹 Limpiando imágenes antiguas..."
docker image prune -f

echo.
echo "✅ ¡Actualización completada!"
echo "   La aplicación está corriendo en el puerto 80 (o el definido en el YAML)."
