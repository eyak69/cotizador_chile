const { sequelize } = require('./database');
const { Empresa, Parametro } = require('./models/mysql_models');

async function checkState() {
    try {
        await sequelize.authenticate();
        console.log("--- DB CHECK ---");

        const mapfre = await Empresa.findOne({ where: { nombre: 'MAPFRE' } });
        if (mapfre) {
            console.log(`MAPFRE Pages: ${mapfre.paginas_procesamiento} (Type: ${typeof mapfre.paginas_procesamiento})`);
        } else {
            console.log("MAPFRE not found.");
        }

        const debugParam = await Parametro.findByPk('DEBUG');
        if (debugParam) {
            console.log(`DEBUG Param: '${debugParam.valor}'`);
        } else {
            console.log("DEBUG Param not found.");
        }

        console.log("----------------");
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

checkState();
