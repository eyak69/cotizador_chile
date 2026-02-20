const { User } = require('../../models/mysql_models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_desarrollo';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// true solo si la variable de entorno REGISTRATION_OPEN es exactamente 'true'
const isRegistrationOpen = () => process.env.REGISTRATION_OPEN === 'true';

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role, displayName: user.displayName },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// --- ESTADO DEL REGISTRO (público, no requiere token) ---
exports.registrationStatus = (req, res) => {
    res.json({ open: isRegistrationOpen() });
};

// --- REGISTRO con Email/Contraseña ---
exports.register = async (req, res) => {
    try {
        if (!isRegistrationOpen()) {
            return res.status(403).json({
                message: 'El registro está cerrado. Contacta al administrador para obtener acceso.'
            });
        }

        const { email, password, displayName } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email y contraseña requeridos' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
        }

        const existing = await User.findOne({ where: { email } });
        if (existing) {
            return res.status(400).json({ message: 'Ya existe una cuenta con ese email' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            email,
            password: hashedPassword,
            displayName: displayName || email.split('@')[0],
            authProvider: 'local'
        });

        const token = generateToken(newUser);
        res.status(201).json({
            token,
            user: { id: newUser.id, email: newUser.email, displayName: newUser.displayName, role: newUser.role }
        });
    } catch (error) {
        console.error('Error en register:', error);
        res.status(500).json({ message: 'Error en el servidor al registrar usuario' });
    }
};

// --- LOGIN con Email/Contraseña ---
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email y contraseña requeridos' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'Credenciales inválidas' });
        }

        // El usuario fue creado por el admin sin contraseña
        // y nunca usó Google → debe configurar su contraseña
        if (!user.password && !user.googleId) {
            const setupToken = jwt.sign(
                { id: user.id, purpose: 'setup_password' },
                JWT_SECRET,
                { expiresIn: '1h' }
            );
            return res.status(200).json({
                needsSetup: true,
                setupToken,
                message: 'Debes crear tu contraseña para continuar'
            });
        }

        // Si solo se registró con Google (tiene googleId pero no password)
        if (!user.password) {
            return res.status(400).json({ message: 'Esta cuenta usa Google para iniciar sesión' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Credenciales inválidas' });
        }

        const token = generateToken(user);
        res.json({
            token,
            user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ message: 'Error en el servidor al iniciar sesión' });
    }
};

// --- CREAR CONTRASEÑA (primer acceso) ---
exports.setupPassword = async (req, res) => {
    try {
        const { setupToken, newPassword } = req.body;

        if (!setupToken || !newPassword) {
            return res.status(400).json({ message: 'Token y nueva contraseña requeridos' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
        }

        let decoded;
        try {
            decoded = jwt.verify(setupToken, JWT_SECRET);
        } catch {
            return res.status(401).json({ message: 'Token inválido o expirado. Intenta iniciar sesión de nuevo.' });
        }

        if (decoded.purpose !== 'setup_password') {
            return res.status(401).json({ message: 'Token no válido para esta operación' });
        }

        const user = await User.findByPk(decoded.id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await user.update({ password: hashedPassword });

        // Generar token normal para hacer login directo
        const token = generateToken(user);
        res.json({
            token,
            user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
            message: 'Contraseña creada correctamente'
        });
    } catch (error) {
        console.error('Error en setupPassword:', error);
        res.status(500).json({ message: 'Error al configurar contraseña' });
    }
};

// --- LOGIN / REGISTRO con Google ---
exports.googleAuth = async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ message: 'Token de Google requerido' });
        }

        // Verificar el token con Google usando el access_token enviado por frontend
        const googleResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${credential}` }
        });

        if (!googleResponse.ok) {
            return res.status(401).json({ message: 'Token de Google inválido o expirado' });
        }

        const payload = await googleResponse.json();
        const { sub: googleId, email, name, picture } = payload;

        // Buscar usuario existente por googleId o email
        let user = await User.findOne({ where: { googleId } });

        if (!user) {
            user = await User.findOne({ where: { email } });

            if (user) {
                // Vincular cuenta Google a cuenta local existente
                await user.update({ googleId, authProvider: 'google', displayName: user.displayName || name });
            } else {
                // Usuario nuevo con Google — verificar si el registro está abierto
                if (!isRegistrationOpen()) {
                    return res.status(403).json({
                        message: 'El registro está cerrado. Contacta al administrador para obtener acceso.'
                    });
                }
                user = await User.create({
                    email, googleId,
                    displayName: name,
                    authProvider: 'google',
                    password: null
                });
            }
        }

        const token = generateToken(user);
        res.json({
            token,
            user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role, picture }
        });
    } catch (error) {
        console.error('Error en googleAuth:', error);
        res.status(401).json({ message: 'Token de Google inválido o expirado' });
    }
};

// --- USUARIO ACTUAL ---
exports.me = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'email', 'displayName', 'role', 'authProvider']
        });
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error en me:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
