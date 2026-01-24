const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quoteController');

router.get('/', quoteController.getQuotes);
router.delete('/:id', quoteController.deleteQuote);
router.get('/:id/excel', quoteController.downloadExcel);
router.get('/:id/word', quoteController.downloadWord);

// Detalles individuales
// Nota: en server.js original esta ruta era /api/quote-details/:id
// En el router principal, si montamos esto en /api/quotes, la ruta quedaría /api/quotes/details/:id 
// o podemos montar un segundo router para /api/quote-details.
// Para mantener consistencia con REST, lo ideal sería PUT /api/quotes/details/:id
// Pero el frontend llama a /api/quote-details/:id
// Así que en server.js deberíamos montar este router o crear uno separado. 
// O simplificar y poner todo en este router y montar rutas específicas.
// Para evitar romper el frontend, mantendremos la ruta base en server.js como '/api'
// y definiremos aquí '/quote-details/:id'.
// Espera, la "cleanest way" es tener routers por recurso.
// QuoteRoutes -> /quotes
// DetailRoutes -> /quote-details ?
// O QuoteRoutes maneja todo.
// Si QuoteRoutes se monta en /api, entonces:
// router.get('/quotes', ...)
// router.put('/quote-details/:id', ...)

// Vamos a asumir que "quoteRoutes" se montará en "/api" para ser flexible, 
// o se montará en "/api/quotes" y tendremos otro para details.
// Miremos server.js: app.put('/api/quote-details/:id'...)
// Voy a poner todo lo relacionado a quotes en este archivo y exportar un router que asuma prefix '/api'.
// O mejor, el router exporta rutas relativas y en server.js decidimos el mount point.
// Si monto quoteRoutes en /api/quotes, entonces updateDetail debería ser /api/quotes/details/:id?
// El frontend espera /api/quote-details/:id.
// Opción A: Refactor front. NO.
// Opción B: Montar router en /api y definir rutas completas.
// Opción C: Separar en quoteRoutes (/api/quotes) y quoteDetailRoutes (/api/quote-details).

// Voy a usar Opción C para modularidad estricta, pero por simplicidad ahora pondré el controller de details aquí
// y en server.js montaré dos veces o definiré rutas específicas.
// MEJOR: Definiré las rutas relativas a la raíz del API en este archivo si lo monto en /api?
// No, express.Router suele montarse en un prefijo.
// Hagamos esto: router.put('/quote-details/:id', ...) y router.get('/quotes', ...).
// Esto implica que este archivo es un "GeneralApiRouter" o "QuotesCombinedRouter".
// Para seguir el patrón, haré lo siguiente:
// quoteRoutes.js maneja las operaciones de '/api/quotes'.
// PERO el updateDetail está en '/api/quote-details'.
// Lo incluiré aquí pero tendré que montarlo en server.js de forma inteligente.
// O simplemente exporto dos routers o configuro las rutas con path absoluto desde el mount point '/' no se puede.

// DECISION:
// quoteRoutes.js -> manejará '/quotes' (get, delete, downloads)
// quoteDetailRoutes.js -> manejará '/quote-details' (put)
// Ambos usarán quoteController.js.

// Archivo actual: quoteRoutes.js (solo /quotes)

router.get('/:id/excel', quoteController.downloadExcel);
router.get('/:id/word', quoteController.downloadWord);
// Las rutas anteriores asumen mount en /api/quotes

module.exports = router;
