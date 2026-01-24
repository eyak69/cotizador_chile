# Lecciones Aprendidas

## Generación de Documentos Word
- **Librería Recomendada:** Usar siempre `docxtemplater` junto con `pizzip`. Es el estándar de la industria, robusto y con documentación clara.
- **Evitar:** `docx-templates` (la libería anterior) tiene una sintaxis confusa (`+++`, `INS $`, `FOR`) y es propensa a errores difíciles de depurar en bucles y tablas.
- **Sintaxis Correcta (Docxtemplater):**
  - Variables simples: `{variable}`
  - Bucles en tablas: `{#lista}` en la primera celda y `{/lista}` en la última celda de la fila.
  - La data debe ser limpia (arrays de objetos simples) sin necesidad de prefijos extraños como `$`.

## Arquitectura Backend
- **Modularización:** Separar `app.js` (Express Config) de `server.js` (Entry Point) facilita las pruebas y mantiene el código limpio.
- **Servicios:** Encapsular lógica compleja (ej. `QuoteProcessingService`, `DocumentService`) evita controladores "gordos" y promueve la reutilización.
- **Organización de Scripts:** Mantener scripts de utilidad en `scripts/utils/` en lugar de la raíz previene el desorden y aclara el propósito de cada archivo.

## Frontend (React/Material UI)
- **Master-Detail:** Para tablas complejas, usar el patrón "Collapsible Table" con `TableRow` anidados y `Collapse`. Permite mostrar detalles sin sobrecargar la vista principal ni obligar a descargar archivos.
