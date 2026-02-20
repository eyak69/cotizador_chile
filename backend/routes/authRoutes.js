const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/status', authController.registrationStatus);      // público
router.post('/register', authController.register);             // solo si REGISTRATION_OPEN=true
router.post('/login', authController.login);
router.post('/setup-password', authController.setupPassword);  // primer acceso sin contraseña
router.post('/google', authController.googleAuth);
router.get('/me', authMiddleware, authController.me);

module.exports = router;
