#!/bin/bash

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================================${NC}"
echo -e "${GREEN}     INICIANDO COTIZADOR INTELIGENTE (Mac/Linux)${NC}"
echo -e "${GREEN}========================================================${NC}"
echo ""

# Verificar si Docker está corriendo
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}[ERROR] DOCKER NO ESTA CORRIENDO.${NC}"
    echo "Por favor, abra 'Docker Desktop' primero y espere a que inicie."
    echo ""
    read -p "Presione Enter para salir..."
    exit 1
fi

echo "1. Descargando ultima version..."
docker compose pull

echo ""
echo "2. Iniciando sistema..."
docker compose up -d

echo ""
echo -e "${GREEN}========================================================${NC}"
echo -e "${GREEN}      SISTEMA LISTO!${NC}"
echo -e "${GREEN}========================================================${NC}"
echo ""
echo "La aplicacion esta disponible en:"
echo "   http://localhost:3001"
echo ""
echo "Abriendo navegador..."
sleep 3
open http://localhost:3001 2>/dev/null || xdg-open http://localhost:3001 2>/dev/null || echo "Por favor abra su navegador manualmente."

echo ""
echo "Presione Enter solo si desea DETENER el sistema."
read

echo "Deteniendo..."
docker compose down
