# Plan de Implementación: Sistema Multiusuario

Este documento detalla los pasos para convertir la aplicación actual en un sistema multiusuario seguro, donde cada usuario tiene acceso privado a sus propias cotizaciones e historial.

## Fase 1: Base de Datos y Modelos (Backend)

### 1.1 Nueva Tabla de Usuarios
- Crear el modelo `User` en `models/mysql_models.js` con los campos:
  - `id` (PK, Integer, AutoIncrement)
  - `email` (String, Unique, NotNull)
  - `password` (String, NotNull) - Se almacenará encriptada.
  - `nombre` (String)
  - `role` (String, Default: 'user') - Para diferenciar administradores de usuarios normales.

### 1.2 Relación de Cotizaciones
- Modificar el modelo `Cotizacion` para incluir `user_id`.
- Establecer la relación: `User` hasMany `Cotizacion`.
- Actualizar `sequelize.sync({ alter: true })` para aplicar cambios en la BD.

## Fase 2: Autenticación y Seguridad (Backend)

### 2.1 Librerías
- Instalar `bcryptjs` para encriptar contraseñas.
- Instalar `jsonwebtoken` para manejo de sesiones seguras.

### 2.2 Middleware de Autenticación
- Crear `middleware/authMiddleware.js` para interceptar peticiones y verificar el token JWT.
- Rechazar peticiones sin token válido.

### 2.3 Rutas de Autenticación
- Crear `routes/authRoutes.js` con endpoints:
  - `POST /api/auth/register`: Registro de nuevos usuarios.
  - `POST /api/auth/login`: Inicio de sesión y entrega de Token.
  - `GET /api/auth/me`: Obtener datos del usuario actual.

## Fase 3: Adaptación de Lógica de Negocio (Backend)

### 3.1 Cotizaciones Privadas
- Modificar `quoteController.js`:
  - `createQuote`: Asignar `user_id` del token al crear.
  - `getQuotes`: Filtrar por `where: { user_id: req.user.id }`.
  - `getQuoteById`: Verificar que la cotización pertenezca al usuario solicitante.

## Fase 4: Interfaz de Usuario (Frontend)

### 4.1 Pantallas de Acceso
- Crear componentes visuales atractivos:
  - `src/pages/LoginPage.jsx`
  - `src/pages/RegisterPage.jsx`

### 4.2 Gestión de Sesión
- Crear `context/AuthContext.jsx` para manejar el estado global del usuario.
- Persistir el token en `localStorage`.
- Configurar interceptor de Axios para enviar el token en cada petición automáticamente.

### 4.3 Protección de Rutas
- Modificar `App.jsx` para mostrar Login/Registro si no hay sesión activa.
- Agregar botón de Cerrar Sesión en el Sidebar.

## Tecnologías a Utilizar
- **Backend**: Node.js, Express, Sequelize, JWT, Bcrypt.
- **Frontend**: React, Material UI (MUI), Axios.

---
**Nota**: Todos los cambios se realizarán priorizando la seguridad y la experiencia de usuario (diseño premium).
