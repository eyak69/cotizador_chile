require('dotenv').config();
const { connectDB, sequelize } = require('./database');
const { Empresa, Parametro } = require('./models/mysql_models');

// --- DATOS POR DEFECTO ---

// 1. EMPRESAS Y REGLAS (Prompts)
const COMPANIES_DATA = [
    {
        nombre: 'SURA',
        paginas_procesamiento: 2,
        prompt_reglas: `Prompt Especializado: Extractor Técnico SURA Chile
Contexto: Actúa como un analista experto en cotizaciones de Seguros SURA Chile. Tu objetivo es extraer datos precisos de una cotización, manejando la limpieza de formatos numéricos complejos.
Instrucciones de Extracción:
1. Limpieza Numérica (Mandatorio): SURA usa la coma (,) como separador decimal. Debes convertir cada coma en un punto (ej. 30,50 -> 30.50).
2. Regla de la Celda Doble: En las tablas de precios, SURA pone el valor Anual arriba y el valor de la Cuota abajo. Extrae siempre el valor superior (el más alto). Ignora el valor de la cuota.
3. Identificación de Primas por Deducible: Ubica la tabla "Plan Seleccionado" o "VALORES PLAN CON OPCIONALES". Mapea los valores para las columnas: D3 UF (3 UF), D5 UF (5 UF) y D10 UF (10 UF).
4. Lógica de Responsabilidad Civil (RC): Busca la sección "Opcionales". Si aparece marcada la opción "RC en Exceso 1000 UF", el monto total de cobertura es de 1000 UF. Indica si es "Independiente" (si dice "c/u") o "Combinada".
5. Validación de Taller de Marca: Revisa la tabla de "Opcionales". Si el ítem "Taller de Marca" está seleccionado o incluido en el plan, marca taller_marca: "SI".
6. Cláusula de Reposición a Nuevo: Busca la "Cláusula de Reposición a Nuevo". Identifica el número de días (ej. 730 días) y conviértelo a meses (ej. 24 meses).`
    },
    {
        nombre: 'MAPFRE',
        paginas_procesamiento: 0,
        prompt_reglas: `Contexto: Actúa como un extractor de datos técnicos para seguros de MAPFRE Chile. Tu objetivo es procesar certificados de renovación o pólizas individuales.
Instrucciones Críticas:
1. Detección de Plan: Identifica el nombre del plan (ej. "PLAN FLEX DEDUCIBLE UF.5"). Si el documento es una renovación cerrada, asigna la prima solo al deducible correspondiente y marca los demás como null.
2. Normalización Numérica: Extrae la "Prima Total" en UF. Sustituye siempre la coma por punto decimal (ej: 20,12 -> 20.12).
3. Responsabilidad Civil (RC): Verifica si el límite de 1000 UF es "Único y Combinado" para daño emergente, moral y lucro cesante.
4. Lógica de Taller: Verifica el año del vehículo. Aplica la regla: Si el vehículo tiene más de 2 años desde su fabricación respecto a la fecha de vigencia, reporta taller_marca: "NO (Por antigüedad)".
5. Asistencias: Extrae si incluye "Auto de reemplazo ilimitado" y el límite de días o condiciones.`
    },
    {
        nombre: 'HDI',
        paginas_procesamiento: 2,
        prompt_reglas: `Prompt Especializado: Extractor de Seguros HDI (Chile)
Contexto: Actúa como un analista experto en seguros de HDI Seguros Chile. Tu objetivo es extraer datos de una cotización de "Seguro VM Balance HDI", optimizando la lectura de tablas de primas y condiciones de uso comercial.
Instrucciones de Extracción:
1. Matriz de Primas por Medio de Pago: Ubica la tabla de "Medios de Pago" (generalmente en la página 2).
   - Prioridad: Extrae siempre los valores de la fila "PAGO AUTOMÁTICO TARJETA CRÉDITO (PAT)".
   - Captura el "Total Prima" anual en UF para los deducibles: UF 3, UF 5 y UF 10.
   - Limpieza: Sustituye comas por puntos decimales (ej: 64,74 -> 64.74).
2. Responsabilidad Civil (RC) en Exceso: Revisa el cuadro de coberturas. Identifica la "Responsabilidad Civil Base" (generalmente 1000 UF) y la "RC en Exceso Individual". Reporta el monto total sumado o el límite máximo indicado (ej: UF 3000 si es 1000 base + 2000 exceso).
3. Lógica de Taller de Marca: Busca la cláusula "Garage de Marca".
   - Verifica el límite de antigüedad. En HDI, generalmente aplica para vehículos con una antigüedad máxima de hasta 5 años.
   - Basado en el año del vehículo (ej: 2023) y la fecha de cotización (2025), determina si califica como SI.
4. Uso Comercial y Restricciones: Identifica el "Tipo de Vehículo" y "Uso". Confirma si es Comercial. Extrae el límite de días del "Vehículo de Reemplazo (VDR)" (ej: 10 días para comercial) y el copago diario.
5. Reposición a Nuevo: Localiza la "Glosa Reposición a Nuevo". Extrae el plazo en días (ej: 730 días) y conviértelo a meses (24 meses).`
    },
    {
        nombre: 'ANS',
        paginas_procesamiento: 3,
        prompt_reglas: `Contexto: Actúa como un experto extractor de datos para ANS (Insurtech de Chile). Tu objetivo es procesar tablas comparativas de seguros automotrices donde figuran varias aseguradoras (ej. Chilena Consolidada, BCI, Zurich).
Reglas de Extracción:
1. Matriz de Primas Anuales: Ubica la tabla de "Valor Prima Anual" en la página 1. Extrae los montos para "Sin Deducible", "UF 3", "UF 5" y "UF 10".
2. Normalización: Convierte todas las comas en puntos decimales (ej: 26,47 -> 26.47).
3. Responsabilidad Civil (RC) Específica:
   - BCI (ExtraMóvil Plus): Extrae el límite de UF 2.000 (Único y combinado).
   - Chilena Consolidada (Full 2.0): Extrae el límite de UF 1.500 independiente para cada ítem (Daño Emergente, Moral y Lucro Cesante).
4. Lógica de Taller de Marca (Crucial): Verifica el año del auto (2015) frente a las cláusulas:
   - Chilena Full 2.0: Taller de marca solo hasta los 3 años (Resultado: NO).
   - ExtraMóvil Plus (BCI): Taller de marca SIN importar la antigüedad del vehículo (Resultado: SI).
5. Detección de Promociones de "Cuota Gratis": Busca los sellos de promoción.
   - BCI: 3ra cuota gratis para contrataciones hasta el 31 de diciembre.
   - Chilena: 1 cuota gratis (Marzo) válida para ventas nuevas con deducible 3 o 5.
6. Beneficios Diferenciadores: Reporta si incluye "Auto de reemplazo superior" (ej. BCI ofrece categoría Sedan Full Automático o Cabify). Menciona beneficios de "Asiento de Pasajero" y "Gastos Médicos"`
    }
];

// 2. PARÁMETROS GLOBALES
const PARAMETERS_DATA = [
    { key: 'GEMINI_API_KEY', default: process.env.GEMINI_API_KEY || '' },
    { key: 'OPENAI_API_KEY', default: process.env.OPENAI_API_KEY || '' },
    { key: 'DEBUG', default: 'true' }, // Por defecto activado para mejor DX
    {
        key: 'IA_CONFIG',
        default: JSON.stringify({
            configuracion_ia: {
                modelo_por_defecto: "gemini-2.5-flash",
                proveedores: {
                    google: {
                        nombre_comercial: "Google Gemini",
                        modelos: [
                            { id_interno: "gemini_flash", nombre: "GEMINI FLASH 2.5", modelo: "gemini-2.5-flash", temperatura: 0.1 },
                            { id_interno: "gemini_pro", nombre: "GEMINI PRO 2.5", modelo: "gemini-2.5-pro", temperatura: 0.0 }
                        ]
                    },
                    openai: {
                        nombre_comercial: "OpenAI GPT",
                        modelos: [
                            { id_interno: "gpt_4o", nombre: "GPT-4o", modelo: "gpt-4o", temperatura: 0.1 },
                            { id_interno: "gpt_4o_mini", nombre: "GPT-4o Mini", modelo: "gpt-4o-mini", temperatura: 0.2 }
                        ]
                    }
                }
            }
        })
    }
];

async function seedDefaults() {
    try {
        await connectDB();
        console.log('🔄 Sincronizando Base de Datos...');
        await sequelize.sync(); // Crea tablas si no existen

        console.log('🏢 asegurando EMPRESAS...');
        for (const company of COMPANIES_DATA) {
            // Upsert: Crea o Actualiza (para asegurar que las reglas estén al día)
            await Empresa.upsert(company);
        }

        console.log('⚙️ asegurando PARÁMETROS...');
        for (const param of PARAMETERS_DATA) {
            const exists = await Parametro.findByPk(param.key);
            if (!exists) {
                await Parametro.create({ parametro: param.key, valor: param.default });
                console.log(`   + Creado: ${param.key}`);
            } else {
                // FORZAR ACTUALIZACIÓN de IA_CONFIG para arreglar modelos rotos
                if (param.key === 'IA_CONFIG') {
                    await exists.update({ valor: param.default });
                    console.log(`   ! Actualizado (Forzado): ${param.key}`);
                } else {
                    console.log(`   . Existe: ${param.key} (No sobreescrito)`);
                }
            }
        }

        console.log('✅ Initialization Complete: defaults seeded successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding defaults:', error);
        process.exit(1);
    }
}

seedDefaults();
