const { sequelize } = require('./database');
const { Empresa } = require('./models/mysql_models');

async function listCompanies() {
    try {
        await sequelize.authenticate();
        console.log("Conectado. Buscando empresas...");
        const firms = await Empresa.findAll();
        if (firms.length === 0) {
            console.log("⚠️ No hay empresas en la BD.");
        } else {
            console.log(`✅ Se encontraron ${firms.length} empresas:`);
            firms.forEach(f => console.log(` - ${f.nombre} (ID: ${f.id})`));
        }
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await sequelize.close();
    }
}

listCompanies();
