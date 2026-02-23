const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Configuración Multer con Validación Estricta
const rootDir = path.resolve(__dirname, '..', '..');
const upload = multer({
    dest: path.join(rootDir, 'uploads', 'temp'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        // Aceptar solo Word (.docx)
        const filetypes = /docx|doc/;
        const mimetype = file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.mimetype === 'application/msword';
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Formato de archivo inválido. Solo se permiten plantillas Word (.docx).'));
    }
});

// Middleware Wrapper para manejo de errores de Multer (Template)
const uploadTemplateMiddleware = (req, res, next) => {
    console.log(`[TEMPLATE UPLOAD] Iniciando subida. Headers: content-type=${req.headers['content-type']}, content-length=${req.headers['content-length']}`);

    const uploadSingle = upload.single('template');

    uploadSingle(req, res, (err) => {
        console.log('[TEMPLATE UPLOAD] Multer finalizado.');
        if (err instanceof multer.MulterError) {
            console.error(`[TEMPLATE UPLOAD MULTER ERROR] ${err.message}`);
            return res.status(400).json({ error: `Error de subida: ${err.message}` });
        } else if (err) {
            console.error(`[TEMPLATE UPLOAD ERROR] ${err.message}`);
            return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
            console.warn('[TEMPLATE UPLOAD WARNING] Req.file está vacío después de Multer.');
            return next();
        }

        console.log(`[TEMPLATE UPLOAD SUCCESS] Archivo recibido: ${req.file.originalname}`);

        // Validación estructurada de Magic Bytes
        import('file-type').then(({ fileTypeFromFile }) => {
            return fileTypeFromFile(req.file.path).then(type => {
                // Word files usually have complex zipped types or simple doc types.
                // Los .docx modernos son application/zip
                const validMimes = ['application/zip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/x-cfb'];
                if (!type || !validMimes.includes(type.mime)) {
                    console.error(`🚨 [SECURITY ALERT] Plantilla maliciosa detectada. Mime recibido: ${type?.mime || 'desconocido'}.`);
                    fs.promises.unlink(req.file.path).catch(() => { });
                    return res.status(400).json({ error: 'Formato de plantilla inválido o engañoso. Solo se permiten archivos de Word.' });
                }
                console.log(`🛡️ [VERIFIED] Plantilla confirmada segura.`);
                next();
            });
        }).catch(err => {
            console.error(`⚠️ [MAGIC BYTES WARNING] No se pudo validar la plantilla: ${err.message}`);
            next();
        });
    });
};


router.get('/', authMiddleware, configController.getConfig);
router.put('/', authMiddleware, configController.updateConfig);
router.post('/parameters', authMiddleware, configController.saveParameter);
router.delete('/parameters/:key', authMiddleware, configController.deleteParameter);

router.post('/template', authMiddleware, uploadTemplateMiddleware, configController.uploadTemplate);
router.get('/template/sample', authMiddleware, configController.downloadSampleTemplate);

module.exports = router;
