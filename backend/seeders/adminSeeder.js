const { User } = require('../../models/mysql_models');

/**
 * Garantiza que el email del administrador principal siempre exista
 * en la base de datos con rol 'admin'.
 * Si el usuario ya existe, solo actualiza el rol.
 * Si no existe, lo crea sin contraseña (deberá entrar con Google).
 */
async function seedAdminUser() {
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'cfanton@gmail.com';

    console.log(`🔐 Verificando usuario admin: ${ADMIN_EMAIL}`);

    const [user, created] = await User.findOrCreate({
        where: { email: ADMIN_EMAIL },
        defaults: {
            email: ADMIN_EMAIL,
            displayName: 'Cristian Fantón',
            role: 'admin',
            authProvider: 'google',
            password: null   // entra con Google
        }
    });

    if (!created) {
        // Asegurar que siempre tenga rol admin aunque alguien lo haya cambiado
        if (user.role !== 'admin') {
            await user.update({ role: 'admin' });
            console.log(`🔄 Rol de ${ADMIN_EMAIL} restaurado a 'admin'.`);
        } else {
            console.log(`✅ Admin ${ADMIN_EMAIL} ya existe.`);
        }
    } else {
        console.log(`✨ Usuario admin creado: ${ADMIN_EMAIL}`);
    }
}

module.exports = seedAdminUser;
