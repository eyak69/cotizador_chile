

### 20-02-2026: Implementación de Diseño Responsivo con Material UI
- **Drawer Responsivo**: Aprendí que para crear un menú lateral que se adapte bien a móviles en React con MUI, la mejor estrategia es usar dos componentes `<Drawer>`. Uno con `variant="temporary"` que se muestra solo en `xs` (móviles) controlado por un estado booleano (`mobileOpen`) y un botón menú, y otro con `variant="permanent"` que se muestra de `sm` en adelante. Esto se logra usando el prop `sx={{ display: { xs: 'block', sm: 'none' } }}` sin necesidad de complejas lógicas de renderizado condicional en JS.
- **Tablas en Móviles**: Para tablas complejas de datos (como historiales y cotizaciones), ocultar columnas a menudo quita información vital al usuario. Es más eficaz envolver el `<Table>` en un contenedor con `overflowX: 'auto'` y darle un `minWidth` a la tabla, garantizando que el usuario pueda hacer *scroll* horizontal (swipe) sin desconfigurar la vista global (`App.jsx`).
