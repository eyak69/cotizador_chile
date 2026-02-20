# Learning.md - Cotizador Chile

## 2026-02-20 - Despliegue en Coolify (Front + Back) sin MySQL

### Qué se implementó
Se preparó la estructura para desplegar la aplicación en un servidor dedicado usando Coolify, aislando el frontend y backend de la base de datos MySQL (ya que esta ya existe de forma externa).

### Archivos Creados
- `docker-compose.coolify.yml`: Al no requerir la base de datos localmente, se creó este archivo especificando exclusivamente el servicio `app`.

### Notas sobre Coolify Docker Compose
- **Volúmenes**: Coolify maneja sus volúmenes, pero declararlos con persistencia de nombre (ej. `cotizador_uploads`) garantiza que al redesplegar, los archivos generados y PDFs subidos por usuarios persistan.
- **Variables de Entorno**: Es fundamental inyectar `${DB_HOST}`, `${DB_USER}`, etc., en el compose y declararlas en la interfaz de Coolify, apuntando a la IP externa de MySQL (`192.168.192.102` en este caso).

### Próximos pasos sugeridos
1. Integrar el despliegue automático desde GitHub a Coolify.
2. Considerar el uso de Nixpacks si se quiere evitar administrar manualmente el `docker-compose.coolify.yml`.



## 2026-02-20 - Organización de Archivos por Usuario y Seguridad

### Qué se implementó
Se organizaron los archivos subidos y generados (PDFs, Excels, Words) en carpetas específicas por usuario para evitar conflictos y mejorar la privacidad en un entorno multiusuario.

### Estructura de Carpetas
- **Uploads Temporales**: `uploads/temp/{userId}/`
  - Aquí llegan los PDFs subidos inicialmente.
  - Aquí se generan los reportes temporales para descarga (Excel/Word).
- **Archivos Finales**: `uploads/final/{userId}/`
  - Aquí se mueven los PDFs procesados que quedan vinculados al historial.

### Cambios Clave en Backend
- **Multer Dinámico (`uploadRoutes.js`)**: Se configuró `diskStorage` con una función `destination` dinámica que usa `req.user.id` para determinar la carpeta de destino.
  - *Lección Importante*: Recordar importar `fs` cuando se usa `fs.existsSync` dentro de la configuración de Multer, de lo contrario el servidor crashea al intentar subir un archivo.
- **Servicios (`DocumentService.js`, `QuoteProcessingService.js`)**: Se actualizaron métodos como `generateExcel`, `generateWord` y `moveFileToFinal` para aceptar `userId` como parámetro y construir las rutas correspondientes.

### Cambios Clave en Frontend
- **Descargas Seguras (`api.js`)**: Se implementó `downloadFile` usando `responseType: 'blob'` y `window.URL.createObjectURL` para manejar descargas protegidas por JWT.
- **Importaciones (`HistoryRow.jsx`)**: Se corrigió un error de sintaxis al importar servicios.
  - *Lección*: Si `api.js` exporta `export const quotes = { ... }`, en otro archivo se debe importar como `import { quotes } from ...` o `import { quotes as anyName }`. No se puede importar `{ quotesService }` si no existe esa exportación nombrada.

## 2026-02-19 - Conversión a Sistema Multiusuario con JWT

### Qué se implementó
Se convirtió la aplicación de monousuario a **multiusuario** con autenticación JWT.

### Arquitectura de Autenticación
- **`bcryptjs`**: Para encriptar contraseñas antes de guardarlas en la BD.
- **`jsonwebtoken`**: Para generar tokens JWT con expiración de 24 horas.
- **`authMiddleware.js`**: Valida el token en el header `Authorization: Bearer <token>` en cada ruta protegida.

### Archivos Creados
- `backend/middleware/authMiddleware.js` - Valida el JWT
- `backend/controllers/authController.js` - register, login, me
- `backend/routes/authRoutes.js` - POST /api/auth/login, /api/auth/register, GET /api/auth/me
- `frontend/src/context/AuthContext.jsx` - Estado global de sesión para React
- `frontend/src/pages/AuthPage.jsx` - UI de login/registro con diseño glassmorphism

### Archivos Modificados
- `models/mysql_models.js` - Nuevo modelo `User` y relación `User hasMany Cotizacion`
- `backend/services/QuoteProcessingService.js` - `saveQuoteToDB` recibe `userId`
- `backend/controllers/quoteController.js` - `getQuotes` filtra por `userId`, `deleteQuote` verifica ownership
- `backend/controllers/uploadController.js` - Pasa `req.user.id` al guardar cotización
- `backend/routes/*.js` - Todas las rutas protegidas con `authMiddleware`
- `frontend/src/services/api.js` - Interceptor para enviar JWT automáticamente + manejo de expiración 401
- `frontend/src/components/Sidebar.jsx` - Muestra usuario actual + botón logout
- `frontend/src/App.jsx` - Si no hay sesión, muestra AuthPage
- `frontend/src/main.jsx` - Envuelto con `<AuthProvider>`

### Patrón de Datos de Usuario por Cotización
- Cada `Cotizacion` tiene un campo `userId` que la vincula al usuario que la creó
- `getQuotes` solo devuelve cotizaciones del usuario autenticado (`WHERE userId = req.user.id`)
- `deleteQuote` verifica que `quote.userId === req.user.id` antes de eliminar

### Lección sobre Sequelize sync({ alter: true })
- Al agregar `User` y la FK `userId` en `Cotizacion`, Sequelize aplicará `ALTER TABLE` automáticamente al iniciar el servidor.
- Las cotizaciones antiguas quedarán con `userId = NULL` (son históricos).

### Configuración del Token
```js
// Duración: 24 horas
jwt.sign({ id, username, role }, JWT_SECRET, { expiresIn: '1d' });
// JWT_SECRET: variable de entorno, default 'secret_key_desarrollo'
```

### Branch Protection en GitHub
- El repositorio tiene reglas de protección en `main` que impiden push directo.
- Se necesita hacer PR desde una rama feature o configurar permisos con el administrador del repo.

### Próximos pasos sugeridos
1. Crear variable de entorno `JWT_SECRET` en el `.env` del servidor con un valor seguro.
2. Considerar agregar panel de administración para gestionar usuarios.
3. Opcionalmente agregar recuperación de contraseña por email.
