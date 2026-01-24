const { sequelize } = require('./database');
const { Empresa } = require('./models/mysql_models');

async function syncSchema() {
    try {
        console.log("Forzando actualización de estructura de Base de Datos...");
        // alter: true intenta adaptar la tabla existente a los nuevos modelos sin borrar datos
        await sequelize.sync({ alter: true });
        console.log("✅ Tablas sincronizadas (nuevas columnas agregadas).");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error al sincronizar:", error);
        process.exit(1);
    }
}

syncSchema();
