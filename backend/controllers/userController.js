const { User } = require('../../models/mysql_models');
const bcrypt = require('bcryptjs');

// GET /api/users — lista todos los usuarios (solo admin)
exports.getUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'email', 'displayName', 'role', 'authProvider', 'createdAt'],
            order: [['createdAt', 'DESC']]
        });
        res.json(users);
    } catch (err) {
        console.error('Error listando usuarios:', err);
        res.status(500).json({ message: 'Error al obtener usuarios' });
    }
};

// POST /api/users — crear usuario (solo admin)
exports.createUser = async (req, res) => {
    try {
        const { email, password, displayName, role } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'El email es requerido' });
        }

        const exists = await User.findOne({ where: { email } });
        if (exists) {
            return res.status(409).json({ message: `Ya existe un usuario con el email ${email}` });
        }

        // La contraseña es OPCIONAL. Si no se pone, el usuario la deberá crear
        // en su primer login (sistema de 'first time setup')
        let hashedPassword = null;
        if (password && password.trim().length > 0) {
            if (password.length < 6) {
                return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
            }
            hashedPassword = await bcrypt.hash(password, 10);
        }

        const user = await User.create({
            email,
            password: hashedPassword, // null si el admin no pone contraseña
            displayName: displayName || null,
            role: role === 'admin' ? 'admin' : 'user',
            authProvider: 'local'
        });

        res.status(201).json({
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            hasPassword: !!hashedPassword
        });
    } catch (err) {
        console.error('Error creando usuario:', err);
        res.status(500).json({ message: 'Error al crear usuario' });
    }
};

// PUT /api/users/:id — actualizar rol y/o nombre (solo admin)
exports.updateUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        const updates = {};
        if (req.body.role) updates.role = req.body.role === 'admin' ? 'admin' : 'user';
        if (req.body.displayName !== undefined) updates.displayName = req.body.displayName || null;

        await user.update(updates);
        res.json({ id: user.id, email: user.email, displayName: user.displayName, role: user.role });
    } catch (err) {
        console.error('Error actualizando usuario:', err);
        res.status(500).json({ message: 'Error al actualizar usuario' });
    }
};

// DELETE /api/users/:id — eliminar usuario (solo admin)
exports.deleteUser = async (req, res) => {
    try {
        // Un admin no puede eliminarse a sí mismo
        if (parseInt(req.params.id) === req.user.id) {
            return res.status(400).json({ message: 'No puedes eliminarte a ti mismo' });
        }
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        await user.destroy();
        res.json({ message: 'Usuario eliminado' });
    } catch (err) {
        console.error('Error eliminando usuario:', err);
        res.status(500).json({ message: 'Error al eliminar usuario' });
    }
};
