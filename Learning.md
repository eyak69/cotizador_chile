# Learning.md - Cotizador Chile

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
