const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado.' });
    }

    try {
        // Si el token viene con 'Bearer ', se elimina
        const cleanToken = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error("⚠️ CRÍTICO: JWT_SECRET no está definido.");
        }
        const decoded = jwt.verify(cleanToken, secret || 'secret_key_desarrollo');
        req.user = decoded;
        next();
    } catch (ex) {
        res.status(400).json({ message: 'Token inválido.' });
    }
};
