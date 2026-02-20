const app = require('./backend/app');
const { connectDB } = require('./database');

const port = 3000;

const seedCompanies = require('./backend/seeders/companySeeder');
const seedAdminUser = require('./backend/seeders/adminSeeder');

// Conexión a Base de Datos
connectDB().then(async () => {
    // Ejecutar Seeder Automático
    try {
        await seedAdminUser();
        await seedCompanies();
        console.log("✅ Seeders iniciales completados.");
    } catch (seedErr) {
        console.error("⚠️ Error corriendo seeder inicial:", seedErr);
    }

    // Start Server solo si la BD conecta (opcional, aquí no bloquea)
    app.listen(port, () => {
        console.log(`Servidor escuchando en http://localhost:${port}`);
        console.log("SERVER IS READY AND WAITING FOR REQUESTS...");
    });
}).catch(err => {
    console.error("Critical DB Connection Error (Server will not start):", err);
});

// Process handlers
process.on('exit', (code) => console.log(`Process exited with code: ${code}`));
