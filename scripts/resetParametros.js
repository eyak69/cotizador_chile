/**
 * Script: resetParametros.js
 * Borra y recrea la tabla parametros con la estructura correcta:
 *   - parametro (STRING, PK)
 *   - valor (TEXT)
 *   - userId (INTEGER, null)
 *   - createdAt / updatedAt
 *
 * Ejecutar ANTES de arrancar el servidor, después de hacer backup.
 * Uso: node scripts/resetParametros.js
 */

require('dotenv').config();
const { sequelize } = require('../database');
const { Parametro } = require('../models/mysql_models');

async function resetParametros() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a MySQL.');

        // Copiar datos existentes en memoria antes de borrar
        let backup = [];
        try {
            const [rows] = await sequelize.query('SELECT * FROM parametros');
            backup = rows;
            console.log(`📋 Backup de ${backup.length} registros en memoria.`);
        } catch (e) {
            console.log('⚠️  No se pudo leer la tabla (puede que no exista):', e.message);
        }

        // Borrar tabla
        await sequelize.query('DROP TABLE IF EXISTS parametros');
        console.log('🗑️  Tabla parametros eliminada.');

        // Recrear con la estructura correcta (Sequelize lee el modelo)
        await Parametro.sync({ force: true });
        console.log('✨ Tabla parametros recreada correctamente.');

        // Restaurar datos que NO tenían userId (parámetros globales/anteriores)
        if (backup.length > 0) {
            const sinUserId = backup.filter(r => r.userId == null);
            console.log(`🔄 Restaurando ${sinUserId.length} parámetros sin userId...`);
            for (const row of sinUserId) {
                await Parametro.upsert({
                    parametro: row.parametro,
                    valor: row.valor,
                    userId: null
                });
            }
            console.log('✅ Datos restaurados.');
        }

        console.log('\n🎉 Listo. Ahora puedes iniciar el servidor normalmente.\n');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

resetParametros();
