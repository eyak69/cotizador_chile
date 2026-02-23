# Learning.md - Cotizador Chile

## 2026-02-20 - Troubeshooting Docker, Vite y Google Login (Coolify)

### 1. Variables de Entorno en Vite (Frontend)
- **Problema**: `import.meta.env.VITE_GOOGLE_CLIENT_ID` devolvía `undefined` en producción o local, causando un error 401 en el login de Google.
- **Solución Errónea**: Intentar inyectarlo modificando `vite.config.js` para leer el `.env` del backend causaba fallos silenciosos en construcciones de Docker.
- **Solución Correcta**: Crear un archivo `.env` dedicado dentro de la carpeta `/frontend` y usar la inyección nativa de Dockerfile (`ARG` y `ENV`) al compilar los estáticos (`npm run build`). Vite _exige_ que las variables existan en tiempo de construcción.

### 2. Google Login: "Wrong number of segments in token"
- **Problema**: El manejador OAuth de Google en backend (`verifyIdToken`) fallaba al recibir el token del frontend (`@react-oauth/google`) lanzando el error "Wrong number of segments".
- **Causa**: El frontend moderno de React OAuth entrega un **Access Token** (cadena opaca corta), no un **ID Token** (JWT de 3 segmentos). La librería de auth de Node espera estrictamente un JWT.
- **Solución**: En vez de decodificar criptográficamente, se reemplazó por un fetch directo al endpoint `https://www.googleapis.com/oauth2/v3/userinfo` pasándole el token en el Header `Authorization: Bearer`. Es más robusto y agnóstico del tipo de token.

### 3. Docker Bind Mounts y Permisos de Directorios (Linux root)
- **Problema**: En Coolify (producción), el frontend de React mostraba error o no generaba el reporte `.docx` de cada usuario (ej. `plantilla_presupuesto_3.docx`). En local sí andaba.
- **Causa 1 (Volumen Faltante)**: Faltaba exponer el volumen compartido `/app/uploads/templates` hacia el host en el `docker-compose.coolify.yml`. Al reiniciarse el contenedor, las plantillas subidas se borraban.
- **Causa 2 (Permisos Linux)**: Cuando se usa `bind mount` hacia `/opt/seguros/...`, Docker hereda los permisos exactos del directorio del Host. Si Node (interno al contenedor) intenta crear directorios `mkdirSync` y el host Linux los creó como `root`, Node falla por falta de permisos. *Lección*: Correr `chmod -R 777 /opt/seguros/uploads` en el servidor host resuelve esto de forma drástica, garantizando que el contenedor pueda escribir subcarpetas.

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

## 2026-02-20 - Clonación de Configuración del Administrador para Nuevos Usuarios

### Qué se implementó
Se agregó una funcionalidad para que, al crearse un nuevo usuario en la plataforma (tanto de forma manual por un administrador, como por auto-registro OAuth o local), el sistema automáticamente le copie la configuración base del administrador principal.

### Detalles de la Implementación
- **`UserSetupService.js`**: Nuevo servicio dedicado a buscar al administrador principal (basado en la variable de entorno `ADMIN_EMAIL` definida en `.env`) y clonar sus configuraciones para el nuevo usuario.
- **Clonación de Empresas**: Se copian los registros de la tabla `Empresas` (nombre, prompt, páginas) asociados al admin para que el nuevo usuario tenga los prompts base ya cargados.
- **Clonación de Parámetros**: Se copian todos los registros de la tabla `Parametros` del admin al nuevo usuario, con las siguientes reglas:
  - Se remueve `MARGEN_DEFECTO` ya que no es aplicable a nuevos usuarios.
  - Las variables sensibles como `GEMINI_API_KEY` y `OPENAI_API_KEY` se insertan vacías, de modo que el usuario quede obligado a completarlas en su configuración.
- **Integración**: Se insertó el llamado al servicio posterior a la creación de registros en `userController.js` (creación manual por admin) y `authController.js` (registro y Google Auth).

### Lecciones
- Al clonar registros con Sequelize usando `bulkCreate()`, asegúrese de proyectar solo los campos deseados omitiendo los `id` originales, y asignando el nuevo `userId`.
- No capturar errores del servicio de clonación hacia arriba previene que el fallo de la copia aborte la creación de la cuenta de usuario.

## 2026-02-21 - Revisión de Seguridad y Ajustes UI Responsivos

### Revisión de Seguridad
1. **Auditoría de Paquetes (`npm audit`)**: Se identificaron 11 vulnerabilidades (10 Altas, 1 Baja) en el backend, principalmente derivadas de dependencias subyacentes (`minimatch` en `exceljs` y `gaxios`). Suponen riesgo de ReDoS (Denegación de servicio por expresiones regulares). Se decidió posponer un `npm audit fix --force` porque actualiza `exceljs` a una versión con *breaking changes*.
2. **Protección de Credenciales**: El archivo `.gitignore` está configurado correctamente impidiendo la subida de `.env` y de la carpeta `uploads/`.
3. **Escudos Express**: Actualmente el servidor (`app.js`) no cuenta con middlewares de seguridad como `helmet` o `express-rate-limit`. Esto se delega a las reglas del proxy en Coolify o se marcará como deuda técnica para futuras implementaciones.

### Ajustes de UI (Grillas vs Listas)
- Se homologó el uso de `Grid` (cuadrícula responsiva de 2 columnas en Desktop) para la "Gestión de Empresas" y la sección de "Usuarios con Acceso" (`UserManager.jsx`), expandiendo sus contenedores de `600px` a `1000px` para una mejor visualización.
- Se aprendió la importancia de consultar/confirmar con el usuario antes de aplicar patrones visuales en bloque: el requerimiento exigía mantener el "Historial de Operaciones" como una lista vertical de una sola columna y paginación a 5 ítems, por motivos de experiencia de usuario específica y requerimientos funcionales.

## 2026-02-23 - Eliminación Completa de Archivos de Lote en Historial

### Qué se implementó
Se mejoró la lógica de eliminación de cotizaciones en `quoteController.js`. Anteriormente solo se eliminaban los archivos cuyas rutas exactas estaban guardadas en `DetalleCotizacion`. Ahora, además de eso, el sistema busca activamente en el directorio de subidas finales (`uploads/final/{userId}`) todos los archivos que comiencen con el prefijo del `loteId` de la cotización y los elimina de forma forzada.

### Evolución a Sistema de Carpetas por Lote
Posteriormente, se observó que nombrar los archivos con prefijo (`1234-archivo.pdf`) generaba problemas si los procesos morían tempranamente en la subida, dejando basura en `uploads/temp`.
La solución definitiva adoptada fue:
1. En el frontend, enviar el ID de lote (header `x-lote-id`) en la subida inicial.
2. En `uploadRoutes.js` (Multer), crear automáticamente un sub-directorio asociado a ese lote temporalmente (`uploads/temp/{userId}/{loteId}`).
3. Al procesar final, la IA mueve los documentos a otro subdirectorio fijo `uploads/final/{userId}/{loteId}`.
4. Al eliminar la cotización, `quoteController.js` ahora aplica `fs.rmSync(dir, { recursive: true })` tanto al directorio temporal como al final de ese lote específico, y borra todo el contenedor en una sola instruccion, lo que es inmensamente más seguro y limpio.

## 2026-02-23 - Reemplazo de window.confirm nativo por MUI Dialogs

### Qué se implementó
Se reemplazaron todos los `window.confirm` nativos del navegador por componentes personalizados `<Dialog>` de Material-UI a lo largo de toda la aplicación, logrando una experiencia visual (UX) consistente con el diseño "glassmorphism" y modo oscuro generalizado.

### Componentes Actualizados
- `HistoryPanel.jsx`: Al eliminar una cotización completa del historial y sus archivos.
- `FileUpload.jsx` (Cotizador): Al quitar un archivo PDF de la bandeja antes de procesar.
- `UserManager.jsx`: Al eliminar permanentemente el acceso de un usuario.
- `SettingsPanel.jsx`: Al eliminar parámetros avanzados de configuración del sistema.
- `CompanyManager.jsx`: Al borrar una entidad aseguradora y sus prompts de IA asociados.

### Lecciones
- Para reemplazar un `window.confirm` sincrónico, es necesario desdoblar la lógica en 3 pasos: (1) Función que abre el modal y guarda en estado el ID del elemento a borrar, (2) Función de "Cancelar" que limpia el estado y cierra el modal, (3) Función de "Confirmar" asincrónica que ejecuta el borrado en la API, recarga los datos y cierra el modal.

## 2026-02-23 - Reintento Automático de IA y Autosanación de Configuración

### Qué se implementó
Se agregó un mecanismo de seguridad y optimización en la subida de cotizaciones (`uploadController.js`). Si el usuario sube un PDF que está configurado para leer solo páginas específicas (ej: *"Páginas 1 y 2"*), pero la IA devuelve valores de primas en `$0` (UF 0), el sistema detecta este fallo asumiendo que el PDF generó la tabla en otra página no esperada. 

Automáticamente, el backend "re-procesa" el mismo archivo pasándole la directiva `0` (procesar todo el documento original), haciendo una segunda petición a Gemini en el acto y guardando esa segunda respuesta exitosa de manera transparente (solo añadiendo el tiempo del re-scan).

### Integración UI: Sugerencia de Optimización - Bug y Fix
Al principio se intentó disparar la sugerencia al "mutar" en memoria `selectedEmpresa.paginas_procesamiento = "0"`. Esto **no funciona** porque Sequelize maneja internamente sus instancias y no refleja mutaciones directas de propiedades en las evaluaciones posteriores.

**Solución correcta:** Se pasó un flag explícito `forceOptimizationSuggestion = true` como parámetro a `saveQuoteToDB()` cuando hay reintento (`isUfCero = true`).

**Segundo bug encontrado:** La condición de entrada al bloque de sugerencia evaluaba `triggerSuggestion` basándose en si `paginas_procesamiento === '0'`. Esto excluía completamente el bloque cuando la empresa tenía páginas configuradas (ej: `"3"`), por lo que `hasNewPages` nunca se calculaba.

**Fix definitivo en `QuoteProcessingService.js`:** Se eliminó la guarda `triggerSuggestion` del outer `if`, dejando que siempre entre al bloque si hay `selectedEmpresa`. Dentro, `hasNewPages` compara las páginas retornadas por la IA (`paginas_encontradas`) con las páginas numéricas configuradas en la empresa (`currentPagesArr`). Si alguna página encontrada no está en la config, se dispara el popup. Esto cubre ambos casos: reintento forzado (UF=0) y detección pasiva de páginas no configuradas.
