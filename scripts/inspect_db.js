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

async function inspect() {
    try {
        await sequelize.authenticate();
        console.log('🔌 Conectado a DB.');

        const users = await sequelize.query("SELECT id, email, role FROM users", { type: Sequelize.QueryTypes.SELECT });
        console.log('\n👥 USUARIOS:');
        console.table(users);

        const params = await sequelize.query("SELECT * FROM parametros", { type: Sequelize.QueryTypes.SELECT });
        console.log('\n⚙️  PARÁMETROS:');
        console.table(params);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

inspect();
