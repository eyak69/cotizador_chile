require('dotenv').config();
const { connectDB, sequelize } = require('./database');
const { Empresa } = require('./models/mysql_models');

async function updateAns() {
    try {
        await connectDB();
        const ans = await Empresa.findOne({ where: { nombre: 'ANS' } });
        if (ans) {
            await ans.update({
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
            });
            console.log("✅ Prompt de ANS actualizado en la Base de Datos.");
        } else {
            console.error("❌ No se encontró la empresa ANS.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

updateAns();
