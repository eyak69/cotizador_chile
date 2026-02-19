const express = require('express');
const path = require('path');
const fs = require('fs');

// --- RUTAS MODULARES ---
const empresaRoutes = require('./routes/empresaRoutes');
const configRoutes = require('./routes/configRoutes');
const quoteRoutes = require('./routes/quoteRoutes');
const quoteDetailRoutes = require('./routes/quoteDetailRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Asegurar directorios esenciales (por si se borraron)
const dirsToCheck = ['uploads/final', 'uploads/temp', 'uploads/templates'];
const rootDir = path.resolve(__dirname, '..'); // Subir un nivel desde backend/
dirsToCheck.forEach(dir => {
    const fullPath = path.join(rootDir, dir);
    if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

// Middleware estático
app.use('/uploads', express.static(path.join(rootDir, 'uploads')));

// --- USO DE RUTAS ---
app.use('/api/empresas', empresaRoutes);
app.use('/api/config', configRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/quote-details', quoteDetailRoutes);
app.use('/api/quote-details', quoteDetailRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/auth', authRoutes);

// --- SERVIR FRONTEND ---
const frontendDist = path.join(rootDir, 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get(/.*/, (req, res, next) => {
        if (req.url.startsWith('/api') || req.url.startsWith('/uploads')) {
            return next();
        }
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
} else {
    console.warn("⚠️ Frontend build NOT found.");
}

const errorHandler = require('./middleware/errorHandler');

// Global Error Handler
app.use(errorHandler);

module.exports = app;
