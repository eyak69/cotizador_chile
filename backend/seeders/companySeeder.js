const { Empresa } = require('../../models/mysql_models');

const companyPrompts = [
    {
        nombre: 'ANS',
        paginas_procesamiento: '1-8,21,26,31',
        prompt_reglas: `Prompt de Extracción de Alta Precisión (ANS)
Contexto: Actúa como un experto extractor de datos para la Insurtech ANS. Tu objetivo es procesar los fragmentos de una cotización de seguros automotrices y generar un JSON estructurado.

Reglas de Negocio a Aplicar:

Primas: Extrae la matriz de "Valor Prima Anual" de la primera tabla. Formatea los números con punto decimal (ej: 23.69).

Responsabilidad Civil (RC): Identifica el monto y si es "LUC" (Límite Único Combinado) o "Independiente" (cuando cada ítem tiene su propio monto).

Lógica de Taller de Marca (Crítico): - El vehículo es un JAC JS8 año 2026.

Compara este año con las cláusulas de antigüedad de cada compañía para determinar si tiene Taller de Marca ("SI" o "NO"). Por ejemplo, si el plan dice "Taller de marca hasta los 3 años", el resultado es SI. Si el plan no menciona límite o es un plan "Full", verifica la cláusula específica de la compañía.

Beneficios de Asistencia: Busca específicamente en las tablas comparativas los beneficios de:

Auto de Reemplazo: Días, copago y si ofrece categoría superior (ej: Sedán Full, Cabify o Awto).

Asiento de Pasajero: Límites por muerte o invalidez.

Promociones: Reporta las cuotas gratis detectadas (ej: "1 cuota gratis: Cuota 3", "3 cuotas gratis: 3, 6 y 9" o "Cuota Julio 2026 gratis").`
    },
    {
        nombre: 'HDI',
        paginas_procesamiento: '2',
        prompt_reglas: `Prompt de Extracción HDI 
Contexto: Actúa como un experto extractor de datos de seguros. Tu objetivo es procesar documentos de cotización y generar un JSON con datos exactos, evitando suposiciones preestablecidas.

Instrucciones de Extracción:

Identificación del Producto: Localiza el nombre exacto del plan (ej. "HDI Premium" o "VM Balance"). No asumas nombres de planes anteriores.

Matriz de Primas (Prioridad PAT): - Busca la tabla de precios. Extrae los valores para Pago Automático de Tarjeta (PAT) o el medio de pago principal.

Captura el "Total Prima" anual en UF para deducibles: SD (0), 3, 5 y 10.

Normaliza: Cambia comas por puntos (ej: 45,12 -> 45.12).

Responsabilidad Civil (RC) Total:

No asumas bases de 1000 UF. Busca en el cuadro de coberturas la "RC Base" y la "RC en Exceso".

Suma ambos montos para reportar el límite total de protección.

Lógica de Taller (Basada en el Vehículo):

Identifica el Año del Vehículo y el Uso (Particular o Comercial) directamente del documento.

Busca la cláusula de "Garage de Marca" o "Taller de Marca" y verifica el límite de años.

Determina "SI" o "NO" cruzando el año del vehículo con la regla de la póliza.

Vehículo de Reemplazo (VDR):

Extrae el número de días exactos y el copago según el Uso detectado en el archivo. No fuerces límites de días fijos.

Reposición a Nuevo:

Localiza la glosa de reposición (0 km). Si figura en días, conviértelo a meses (ej: 730 días = 24 meses).`
    },
    {
        nombre: 'SURA',
        paginas_procesamiento: '2',
        prompt_reglas: `Prompt Genérico Especializado: SURA Chile
Contexto: Actúa como un analista experto en Seguros SURA Chile. Tu objetivo es extraer datos de una cotización de seguros automotrices y generar un JSON estructurado. Debes aplicar reglas específicas de interpretación para la estructura de documentos de SURA.

Reglas de Extracción Técnicas:

Regla de la Celda Doble (Prioridad): En las tablas de precios, SURA suele mostrar dos valores en una misma celda. El valor superior es la Prima Anual y el inferior es la cuota mensual. Extrae siempre el valor superior (Anual).

Limpieza Numérica: Convierte todas las comas en puntos decimales para asegurar un formato procesable (ej: 25,40 -> 25.40).

Identificación de Plan: Identifica cuál es el plan cotizado (ej: Classic, Full o Premium) basándote en la columna seleccionada en la tabla de valores.

Responsabilidad Civil (RC): Identifica el monto de RC. Si el documento indica "c/u" (cada uno), clasifica el tipo como "Independiente". De lo contrario, clasifícalo como "LUC/Combinada".

Opcionales Seleccionados (Taller de Marca): Revisa la sección de "Opcionales Cotizados". Si el ítem "Taller de Marca" aparece marcado o con un valor asociado, establece taller_marca como "SI".

Reposición a Nuevo: Localiza la cláusula de reposición (0 km). Si el plazo está en días, conviértelo a meses (ej: 730 días -> 24 meses / 365 días -> 12 meses).

Deducible Adicional (Conductor Joven): Verifica si existe la cláusula "Menor de 30 años" y reporta el deducible adicional en el campo de otros beneficios.`
    },
    {
        nombre: 'MAPFRE',
        paginas_procesamiento: '2',
        prompt_reglas: `Prompt Genérico Especializado: MAPFRE Chile
Contexto: Actúa como un analista experto en MAPFRE Seguros Chile. Tu objetivo es extraer datos de una cotización y generar un JSON estructurado aplicando las reglas de negocio de la compañía.

Instrucciones de Extracción:

Matriz de Primas (PAT): Ubica la tabla "CUADRO RESUMEN DE PRIMAS". Extrae los valores de la fila "PAT DOC. 12 CUOTAS" para los planes FLEX y MASTER en los deducibles 0, 3, 5 y 10 UF. Convierte comas en puntos (ej: 6.74).

Responsabilidad Civil (RC): Identifica la "RC Comprensiva" (Base 1000 UF). Si el plan es MASTER, suma el "Exceso de UF 1500" para un total de UF 2500. Clasifica como "LUC/Combinada".

Lógica de Taller de Marca: El vehículo es año 2012. Verifica la cláusula "Taller de Marca Primeros 2 Años". Dado que el auto tiene más de 2 años, marca taller_marca como "NO".

Reposición a Nuevo: Busca la cláusula "Reposición de Automóvil Cero Kilómetro". Convierte los 365 días a "12 meses".


Deducible Inteligente: Confirma si incluye la cláusula "Asegurado Responsable" y menciónalo en beneficios.


Auto de Reemplazo: Identifica el límite de 25 días y el copago de $5.000`
    }
];

async function seedCompanies() {
    console.log("🌱 Verificando/Creando Prompts Maestros (globales, userId=null)...");
    for (const data of companyPrompts) {
        // Empresas globales de referencia (userId = null)
        const [empresa, created] = await Empresa.findOrCreate({
            where: { nombre: data.nombre, userId: null },
            defaults: { ...data, userId: null }
        });

        if (!created) {
            console.log(`⏭️  ${data.nombre} ya existe. Saltando.`);
        } else {
            console.log(`✨ Empresa plantilla creada: ${data.nombre}`);
        }
    }
    console.log("✅ Seed completado.");
}

module.exports = seedCompanies;
