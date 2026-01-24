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
    });

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('MySQL Conectado con Sequelize.');
        await sequelize.sync({ alter: true });
        console.log('Tablas sincronizadas (Alter: True).');
    } catch (error) {
        console.error('No se pudo conectar a la base de datos:', error.message);
    }
};

module.exports = { sequelize, connectDB };
