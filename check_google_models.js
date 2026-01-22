require('dotenv').config();
const { connectDB, sequelize } = require('./database');
const { Parametro } = require('./models/mysql_models');

async function checkModels() {
    try {
        await connectDB();
        const paramKey = await Parametro.findByPk('GEMINI_API_KEY');
        // Usar de BD primero, sino de env
        const apiKey = paramKey ? paramKey.valor : process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("❌ No GEMINI_API_KEY found in DB or .env");
            return;
        }

        console.log("Resolving available models...");

        // Llamada directa a REST API para evitar líos de SDK versión
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("✅ Models Available:");
            data.models.forEach(m => {
                // Filtrar solo los que nos interesan
                if (m.name.includes("gemini")) {
                    console.log(` - ${m.name} (${m.version}) [Methods: ${m.supportedGenerationMethods}]`);
                }
            });
        } else {
            console.error("❌ Could not list models (API Error):", data);
        }

    } catch (error) {
        console.error("❌ Error listing models:", error);
    } finally {
        await sequelize.close(); // Cerrar conexión
    }
}

checkModels();
