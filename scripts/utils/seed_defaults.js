require('dotenv').config();
const { connectDB, sequelize } = require('../../database');
const { Empresa, Parametro } = require('../../models/mysql_models');

// --- DATOS POR DEFECTO ---

// NOTA: La siembra de empresas se ha movido a backend/seeders/companySeeder.js
// para evitar sobrescribir configuraciones manuales y mantener una única fuente de verdad.
console.log('🏢 (Saltado) La siembra de empresas ahora la maneja companySeeder.js al iniciar el servidor.');

console.log('⚙️ asegurando PARÁMETROS...');
for (const param of PARAMETERS_DATA) {
    const exists = await Parametro.findByPk(param.key);
    if (!exists) {
        await Parametro.create({ parametro: param.key, valor: param.default });
        console.log(`   + Creado: ${param.key}`);
    } else {
        // FORZAR ACTUALIZACIÓN de IA_CONFIG para arreglar modelos rotos
        if (param.key === 'IA_CONFIG') {
            await exists.update({ valor: param.default });
            console.log(`   ! Actualizado (Forzado): ${param.key}`);
        } else {
            console.log(`   . Existe: ${param.key} (No sobreescrito)`);
        }
    }
}

console.log('✅ Initialization Complete: defaults seeded successfully.');
process.exit(0);
    } catch (error) {
    console.error('❌ Error seeding defaults:', error);
    process.exit(1);
}
}

seedDefaults();
