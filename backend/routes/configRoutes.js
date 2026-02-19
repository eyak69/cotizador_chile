const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Configuración Multer local para rutas de config
const rootDir = path.resolve(__dirname, '..', '..');
const upload = multer({ dest: path.join(rootDir, 'uploads', 'temp') });

router.get('/', authMiddleware, configController.getConfig);
router.put('/', authMiddleware, configController.updateConfig);
router.post('/parameters', authMiddleware, configController.saveParameter);
router.delete('/parameters/:key', authMiddleware, configController.deleteParameter);

router.post('/template', authMiddleware, upload.single('template'), configController.uploadTemplate);
router.get('/template/sample', authMiddleware, configController.downloadSampleTemplate);

module.exports = router;
