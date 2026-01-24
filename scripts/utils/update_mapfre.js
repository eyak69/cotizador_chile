require('dotenv').config();
const { connectDB, sequelize } = require('./database');
const { Empresa } = require('./models/mysql_models');

async function updateMapfre() {
    try {
        await connectDB();
        const mapfre = await Empresa.findOne({ where: { nombre: 'MAPFRE' } });
        if (mapfre) {
            await mapfre.update({
                prompt_reglas: `Contexto: Actúa como un extractor de datos técnicos para seguros de MAPFRE Chile. Tu objetivo es procesar certificados de renovación o pólizas individuales.
Instrucciones Críticas:
1. Detección de Plan: Identifica el nombre del plan (ej. "PLAN FLEX DEDUCIBLE UF.5"). Si el documento es una renovación cerrada, asigna la prima solo al deducible correspondiente y marca los demás como null.
2. Normalización Numérica: Extrae la "Prima Total" en UF. Sustituye siempre la coma por punto decimal (ej: 20,12 -> 20.12).
3. Responsabilidad Civil (RC): Verifica si el límite de 1000 UF es "Único y Combinado" para daño emergente, moral y lucro cesante.
4. Lógica de Taller: Verifica el año del vehículo. Aplica la regla: Si el vehículo tiene más de 2 años desde su fabricación respecto a la fecha de vigencia, reporta taller_marca: "NO (Por antigüedad)".
5. Asistencias: Extrae si incluye "Auto de reemplazo ilimitado" y el límite de días o condiciones.`
            });
            console.log("✅ Prompt de MAPFRE actualizado en la Base de Datos.");
        } else {
            console.error("❌ No se encontró la empresa MAPFRE.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

updateMapfre();
