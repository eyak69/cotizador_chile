# Cotizador Inteligente IA 🚗

Sistema automatizado que lee pólizas de seguro en PDF, extrae información clave con IA y genera cotizaciones estructuradas, visualizadas en un dashboard moderno.

## Características

*   **IA (OpenAI)**: Extracción inteligente de datos (Deducibles, Primas, Coberturas).
*   **Backend**: Node.js + Express.
*   **Frontend**: React + Vite + Material UI (Dark Mode).
*   **Base de Datos**: MySQL (con Sequelize ORM).
*   **Docker**: Despliegue contenerizado completo.

## Requisitos Previos

*   **Opción A (Docker)**: Tener Docker Desktop instalado (Recomendado).
*   **Opción B (Manual)**: Node.js 18+ y MySQL instalados localmente.
*   **API Key**: Una Key válida de OpenAI en el archivo `.env`.

## 🚀 Modos de Ejecución

### 1. Desarrollo Local (Rápido)
Ideal para trabajar en tu máquina usando tu base de datos local.
```bash
# Inicia Backend y Frontend en una sola terminal
npm run dev
```
*   Backend: `http://localhost:3000`
*   Frontend: `http://localhost:5173`
*   Base de Datos: Tu MySQL local (`127.0.0.1`).

### 2. Producción (Docker)
Ideal para desplegar. **Incluye su propia Base de Datos independendiente**.
```bash
docker-compose up --build
```
*   Web App: `http://localhost:8080`
*   Base de Datos: Contenedor MySQL interno (volumen persistente).

## Estructura de Datos
El sistema guarda:
*   **Cotización**: Datos del Cliente y Vehículo.
*   **Detalles**: Múltiples opciones de planes con sus respectivas primas por deducible (UF 3, 5, 10).
