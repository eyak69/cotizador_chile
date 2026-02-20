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

async function check() {
    try {
        await sequelize.authenticate();
        const [results] = await sequelize.query("SELECT * FROM parametros");
        console.log(`📊 Total parámetros en la tabla: ${results.length}`);
        if (results.length > 0) {
            console.log("Muestra de datos:", results.slice(0, 3));
        }
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

check();
