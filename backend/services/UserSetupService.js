const { User, Empresa, Parametro } = require('../../models/mysql_models');

class UserSetupService {
    /**
     * Configura a un usuario recién creado clonando las Empresas y Parámetros del administrador principal.
     * @param {number} newUserId - El ID del nuevo usuario creado
     */
    async setupNewUser(newUserId) {
        try {
            console.log(`[UserSetupService] Iniciando configuración para nuevo usuario ID: ${newUserId}`);

            // 1. Buscar al administrador principal usando el email definido en .env
            const adminEmail = process.env.ADMIN_EMAIL || 'cfanton@gmail.com';
            const adminUser = await User.findOne({
                where: { email: adminEmail }
            });

            if (!adminUser) {
                console.warn(`[UserSetupService] No se encontró un usuario administrador con el email ${adminEmail} para clonar configuración.`);
                return;
            }

            console.log(`[UserSetupService] Administrador de referencia encontrado ID: ${adminUser.id} (${adminUser.email})`);

            // 2. Clonar Empresas
            let adminEmpresas = await Empresa.findAll({ where: { userId: adminUser.id } });

            // Si el admin no tiene empresas guardadas explícitamente, iteramos sobre las globales (userId: null)
            if (adminEmpresas.length === 0) {
                console.log('[UserSetupService] El administrador no tiene empresas. Copiando empresas globales (userId: null).');
                adminEmpresas = await Empresa.findAll({ where: { userId: null } });
            }

            if (adminEmpresas.length > 0) {
                for (const empresa of adminEmpresas) {
                    await Empresa.create({
                        nombre: empresa.nombre,
                        prompt_reglas: empresa.prompt_reglas,
                        paginas_procesamiento: empresa.paginas_procesamiento,
                        userId: newUserId // Aseguramos usar explícitamente el nuevo ID
                    });
                }
                console.log(`[UserSetupService] Se copiaron ${adminEmpresas.length} empresas al usuario ${newUserId}.`);
            } else {
                console.log('[UserSetupService] No hay empresas de origen para copiar.');
            }

            // 3. Clonar Parámetros
            const adminParametros = await Parametro.findAll({ where: { userId: adminUser.id } });
            let countParams = 0;

            for (const param of adminParametros) {
                // Se excluye MARGEN_DEFECTO
                if (param.parametro === 'MARGEN_DEFECTO') continue;

                let valor = param.valor;

                // Las llaves de IA deben cargarse vacías
                if (param.parametro === 'GEMINI_API_KEY' || param.parametro === 'OPENAI_API_KEY') {
                    valor = '';
                }

                await Parametro.create({
                    parametro: param.parametro,
                    valor: valor,
                    userId: newUserId // Aseguramos usar explícitamente el nuevo ID
                });
                countParams++;
            }

            if (countParams > 0) {
                console.log(`[UserSetupService] Se copiaron ${countParams} parámetros al usuario ${newUserId}.`);
            } else {
                console.log('[UserSetupService] No hay parámetros copiables del admin al usuario.');
            }

            console.log(`[UserSetupService] Configuración de usuario ${newUserId} finalizada con éxito.`);
        } catch (error) {
            console.error(`[UserSetupService] Error configurando al nuevo usuario ${newUserId}:`, error);
            // No arrojamos el error hacia arriba para que la creación del usuario no falle si esto falla.
            // Si la copia falla, el usuario de todos modos se creó.
        }
    }
}

module.exports = new UserSetupService();
