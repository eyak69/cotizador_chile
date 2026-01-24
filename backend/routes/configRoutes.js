const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const multer = require('multer');
const path = require('path');

// Configuración Multer local para rutas de config
const rootDir = path.resolve(__dirname, '..', '..');
const upload = multer({ dest: path.join(rootDir, 'uploads', 'temp') });

router.get('/', configController.getConfig);
router.put('/', configController.updateConfig);
router.post('/parameters', configController.saveParameter);
router.delete('/parameters/:key', configController.deleteParameter);

router.post('/template', upload.single('template'), configController.uploadTemplate);
router.get('/template/sample', configController.downloadSampleTemplate);

module.exports = router;
