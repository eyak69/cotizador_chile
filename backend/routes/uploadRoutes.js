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
        const userId = req.user ? req.user.id : 'anonymous';
        const loteId = req.headers['x-lote-id'] || Date.now().toString();
        let userDir = path.join(rootDir, 'uploads', 'temp', String(userId), String(loteId));

        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }
        cb(null, userDir);
    },
    filename: (req, file, cb) => {
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
            return next();
        }

        console.log(`✅ [UPLOAD MULTER SUCCESS] Archivo recibido en backend.`);

        // Validación Estricta con Magic Bytes
        import('file-type').then(({ fileTypeFromFile }) => {
            return fileTypeFromFile(req.file.path).then(type => {
                if (!type || type.mime !== 'application/pdf') {
                    console.error(`🚨 [SECURITY ALERT] Archivo rechazado por Magic Bytes. Esperado PDF, obtenido: ${type?.mime || 'desconocido'}.`);
                    fs.promises.unlink(req.file.path).catch(() => { });
                    return res.status(400).json({ error: 'Formato de archivo engañoso. Solo se permiten PDFs reales.' });
                }
                console.log(`🛡️ [VERIFIED] Archivo confirmado como PDF legítimo: ${req.file.originalname}`);
                next();
            });
        }).catch(err => {
            console.error(`⚠️ [MAGIC BYTES WARNING] No se pudo validar magic bytes: ${err.message}`);
            next();
        });
    });
};

router.post('/', authMiddleware, uploadMiddleware, uploadController.processUpload);

module.exports = router;
