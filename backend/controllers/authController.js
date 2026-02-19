const { User } = require('../../models/mysql_models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_desarrollo';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role, displayName: user.displayName },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// --- REGISTRO con Email/Contraseña ---
exports.register = async (req, res) => {
    try {
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

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

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

        // Si el usuario se registró solo con Google
        if (!user.password) {
            return res.status(400).json({ message: 'Esta cuenta solo usa inicio de sesión con Google' });
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

// --- LOGIN / REGISTRO con Google ---
exports.googleAuth = async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ message: 'Token de Google requerido' });
        }

        // Verificar el token con Google
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        // Buscar usuario existente por googleId o email
        let user = await User.findOne({ where: { googleId } });

        if (!user) {
            // Buscar por email (puede que ya tenga cuenta local)
            user = await User.findOne({ where: { email } });

            if (user) {
                // Vincular la cuenta Google a la cuenta local existente
                await user.update({ googleId, authProvider: 'google', displayName: user.displayName || name });
            } else {
                // Crear nuevo usuario Google
                user = await User.create({
                    email,
                    googleId,
                    displayName: name,
                    authProvider: 'google',
                    password: null  // sin contraseña local
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
