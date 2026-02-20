const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración Multer con DiskStorage para rutas dinámicas por usuario
const rootDir = path.resolve(__dirname, '..', '..');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Asegurar que existe req.user (el authMiddleware debe ir ANTES de multer)
        // Pero multer a veces corre antes si no se organiza bien. 
        // En esta estructura router.post('/', authMiddleware, uploadMiddleware...) 
        // el authMiddleware corre antes, PERO multer se configura aquí al inicio. 
        // TRUCO: Multer middleware se ejecuta cuando se llama 'upload.single'.
        // Para tener acceso a req.user en 'destination', necesitamos que authMiddleware haya corrido.
        // En la definición de la ruta está correcto: authMiddleware -> uploadMiddleware.

        const userId = req.user ? req.user.id : 'anonymous';
        const userDir = path.join(rootDir, 'uploads', 'temp', String(userId));

        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }
        cb(null, userDir);
    },
    filename: (req, file, cb) => {
        // Mantener nombre original pero quizás prevenir colisiones simples si fuera necesario
        // Por ahora mantenemos originalName como pide la lógica de negocio
        cb(null, file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        // Aceptar solo PDF
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Formato de archivo inválido. Solo se permiten PDFs.'), false);
        }
    }
});

// Middleware Wrapper para manejo de errores de Multer
const uploadMiddleware = (req, res, next) => {
    console.log(`\n⬇️  [UPLOAD START] Iniciando carga de archivo...`);
    console.log(`👤  Usuario: ${req.user ? `${req.user.id} (${req.user.email})` : 'NO IDENTIFICADO'}`);

    // Introspección básica del request antes de Multer (headers)
    console.log(`📨  Headers content-length: ${req.headers['content-length']}`);
    console.log(`📨  Headers content-type: ${req.headers['content-type']}`);

    const uploadSingle = upload.single('pdfFile');

    uploadSingle(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // Error de Multer (ej: File too large)
            console.error(`❌ [MULTER ERROR] Code: ${err.code} | Message: ${err.message}`);
            return res.status(400).json({ error: `Error de subida (Multer): ${err.message}` });
        } else if (err) {
            // Otro error (ej: fileFilter)
            console.error(`❌ [UPLOAD ERROR] ${err.message}`);
            return res.status(400).json({ error: `Error al subir archivo: ${err.message}` });
        }

        // Si no hay archivo (aunque multer no siempre falla por esto si no es required en su logica, lo verificamos en controller)
        if (!req.file) {
            console.warn(`⚠️ [UPLOAD WARNING] Petición procesada por Multer pero req.file está vacio.`);
        } else {
            console.log(`✅ [UPLOAD SUCCESS] Archivo recibido exitosamente en backend:`);
            console.log(`   📄 Nombre: ${req.file.originalname}`);
            console.log(`   💾 Type: ${req.file.mimetype}`);
            console.log(`   📏 Size: ${req.file.size} bytes`);
            console.log(`   📂 Path Temp: ${req.file.path}`);
        }

        next();
    });
};

router.post('/', authMiddleware, uploadMiddleware, uploadController.processUpload);

module.exports = router;
