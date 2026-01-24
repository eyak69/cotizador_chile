-- Este script se ejecuta automáticamente al iniciar la base de datos por primera vez

-- 1. Crear Base de Datos si no existe
CREATE DATABASE IF NOT EXISTS cotizador_db;

-- 2. Usar la base de datos
USE cotizador_db;

-- 3. Crear usuario seguro (independiente del root)
-- Nota: 'cotizador_user' y 'cotizador_pass' deben coincidir con claves.env
CREATE USER IF NOT EXISTS 'cotizador_user'@'%' IDENTIFIED BY 'cotizador_pass';

-- 4. Dar permisos
GRANT ALL PRIVILEGES ON cotizador_db.* TO 'cotizador_user'@'%';

-- 5. Aplicar cambios
FLUSH PRIVILEGES;
