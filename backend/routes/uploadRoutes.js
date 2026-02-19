const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Configuración Multer
const rootDir = path.resolve(__dirname, '..', '..');
const upload = multer({ dest: path.join(rootDir, 'uploads', 'temp') });

router.post('/', authMiddleware, upload.single('pdfFile'), uploadController.processUpload);

module.exports = router;
