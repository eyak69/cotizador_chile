const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: 'Demasiados intentos de inicio de sesión. Por favor, inténtalo de nuevo en 15 minutos.' }
});

router.get('/status', authController.registrationStatus);      // público
router.post('/register', authLimiter, authController.register);             // solo si REGISTRATION_OPEN=true
router.post('/login', authLimiter, authController.login);
router.post('/setup-password', authLimiter, authController.setupPassword);  // primer acceso sin contraseña
router.post('/google', authLimiter, authController.googleAuth);
router.get('/me', authMiddleware, authController.me);

module.exports = router;
