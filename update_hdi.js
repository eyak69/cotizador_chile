require('dotenv').config();
const { connectDB, sequelize } = require('./database');
const { Empresa } = require('./models/mysql_models');

async function updateHdi() {
    try {
        await connectDB();
        const hdi = await Empresa.findOne({ where: { nombre: 'HDI' } });
        if (hdi) {
            await hdi.update({
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
            });
            console.log("✅ Prompt de HDI actualizado en la Base de Datos.");
        } else {
            console.error("❌ No se encontró la empresa HDI.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

updateHdi();
