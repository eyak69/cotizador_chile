# --- STAGE 1: Build Frontend ---
FROM node:18-alpine AS build-stage

WORKDIR /app/frontend

# Copia solo package.json del frontend primero para caché
COPY frontend/package*.json ./

# Instala dependencias del Frontend
RUN npm install

# Copia el código fuente del frontend
COPY frontend/ ./

# --- INYECCIÓN DE VARIABLES ENV PARA VITE ---
# Definimos los ARG que se pasarán desde el comando de build o con valor por defecto
ARG VITE_GOOGLE_CLIENT_ID=172467646216-8987bcbjclmqt4hp0p5grjc89tfn7v7a.apps.googleusercontent.com
# Convertimos el ARG en ENV para que npm run build / vite lo vea
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Compila el frontend (React/Vite) -> genera /app/frontend/dist
RUN npm run build

# --- STAGE 2: Production Backend ---
FROM node:18-alpine AS production-stage

WORKDIR /app

# Instala herramientas de compilación para dependencias nativas (si las hubiera)
RUN apk add --no-cache python3 make g++

# Copia dependencias del Backend
COPY package*.json ./

# Instala dependencias del Backend (producción)
RUN npm install --production

# Copia el código fuente del Backend (excluyendo lo del .dockerignore)
COPY . .

# Copia el build del frontend desde el STAGE 1 a la carpeta que espera server.js
# server.js busca en: path.join(__dirname, 'frontend', 'dist')
# __dirname es /app. Entonces copiamos a /app/frontend/dist
COPY --from=build-stage /app/frontend/dist ./frontend/dist

# Exponer puertos
EXPOSE 3000

# Comando de inicio
CMD ["npm", "run", "start"]
