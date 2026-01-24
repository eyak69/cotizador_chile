require('dotenv').config();
const { connectDB, sequelize } = require('./database');
const { Empresa } = require('./models/mysql_models');

async function updateSura() {
    try {
        await connectDB();
        const sura = await Empresa.findOne({ where: { nombre: 'SURA' } });
        if (sura) {
            await sura.update({
                prompt_reglas: `Prompt Especializado: Extractor Técnico SURA Chile
Contexto: Actúa como un analista experto en cotizaciones de Seguros SURA Chile. Tu objetivo es extraer datos precisos de una cotización, manejando la limpieza de formatos numéricos complejos.
Instrucciones de Extracción:
1. Limpieza Numérica (Mandatorio): SURA usa la coma (,) como separador decimal. Debes convertir cada coma en un punto (ej. 30,50 -> 30.50).
2. Regla de la Celda Doble: En las tablas de precios, SURA pone el valor Anual arriba y el valor de la Cuota abajo. Extrae siempre el valor superior (el más alto). Ignora el valor de la cuota.
3. Identificación de Primas por Deducible: Ubica la tabla "Plan Seleccionado" o "VALORES PLAN CON OPCIONALES". Mapea los valores para las columnas: D3 UF (3 UF), D5 UF (5 UF) y D10 UF (10 UF).
4. Lógica de Responsabilidad Civil (RC): Busca la sección "Opcionales". Si aparece marcada la opción "RC en Exceso 1000 UF", el monto total de cobertura es de 1000 UF. Indica si es "Independiente" (si dice "c/u") o "Combinada".
5. Validación de Taller de Marca: Revisa la tabla de "Opcionales". Si el ítem "Taller de Marca" está seleccionado o incluido en el plan, marca taller_marca: "SI".
6. Cláusula de Reposición a Nuevo: Busca la "Cláusula de Reposición a Nuevo". Identifica el número de días (ej. 730 días) y conviértelo a meses (ej. 24 meses).`
            });
            console.log("✅ Prompt de SURA actualizado en la Base de Datos.");
        } else {
            console.error("❌ No se encontró la empresa SURA.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

updateSura();
