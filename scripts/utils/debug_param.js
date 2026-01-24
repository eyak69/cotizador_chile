const { sequelize } = require('../../database');
const { Parametro } = require('../../models/mysql_models');

async function test() {
    try {
        console.log('Conectando a DB...');
        await sequelize.authenticate();
        console.log('Conexión Exitosa.');

        console.log('Intentando UPSERT en Parametro...');
        await Parametro.upsert({ parametro: 'TEST_DEBUG', valor: 'Funcionamiento Correcto' });
        console.log('✅ ÉXITO: Parámetro guardado correctamente en la BD.');
        process.exit(0);
    } catch (e) {
        console.error('❌ ERROR FATAL:', e);
        process.exit(1);
    }
}
test();
