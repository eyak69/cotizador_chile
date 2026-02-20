require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'mysql',
        logging: false,
    }
);

async function fix() {
    try {
        await sequelize.authenticate();
        console.log('🔌 Conectado a DB.');

        // 1. Buscar usuario admin
        const [users] = await sequelize.query("SELECT id, email FROM users WHERE email LIKE '%@%' LIMIT 1");
        if (users.length === 0) {
            console.error('❌ No se encontró ningún usuario para asignar los parámetros.');
            process.exit(1);
        }
        const adminUser = users[0];
        console.log(`👤 Usuario encontrado: ${adminUser.email} (ID: ${adminUser.id})`);

        // 2. Actualizar parámetros
        console.log('🔄 Asignando todos los parámetros a este usuario...');
        const [result] = await sequelize.query(`UPDATE parametros SET userId = ${adminUser.id}`);

        console.log(`✅ ${result.affectedRows} parámetros actualizados.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

fix();
