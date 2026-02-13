const { Empresa, Parametro } = require('../../models/mysql_models');
const path = require('path');
const fs = require('fs');

const getRootDir = () => path.resolve(__dirname, '..', '..');

class AdminService {

    // --- Lógica de Empresas ---

    async getAllEmpresas() {
        return await Empresa.findAll();
    }

    async createEmpresa(data) {
        return await Empresa.create({
            nombre: data.nombre,
            prompt_reglas: data.prompt_reglas,
            paginas_procesamiento: data.paginas_procesamiento !== undefined ? data.paginas_procesamiento : 2
        });
    }

    async updateEmpresa(id, data) {
        const empresa = await Empresa.findByPk(id);
        if (!empresa) throw new Error("Empresa no encontrada");

        if (data.nombre) empresa.nombre = data.nombre;
        if (data.prompt_reglas) empresa.prompt_reglas = data.prompt_reglas;
        if (data.paginas_procesamiento !== undefined) empresa.paginas_procesamiento = data.paginas_procesamiento;

        return await empresa.save();
    }

    async deleteEmpresa(id) {
        const empresa = await Empresa.findByPk(id);
        if (!empresa) throw new Error("Empresa no encontrada");
        return await empresa.destroy();
    }


    // --- Lógica de Configuración ---

    async getConfig() {
        const params = await Parametro.findAll();
        const config = {};
        params.forEach(p => config[p.parametro] = p.valor);

        // Agregar versión del sistema leida de package.json
        try {
            const packageJson = require('../../package.json');
            config.system_version = packageJson.version;
        } catch (e) {
            config.system_version = 'Unknown';
        }

        return config;
    }

    async updateConfigKeys(geminiKey, openaiKey, iaConfig) {
        if (geminiKey !== undefined) await Parametro.upsert({ parametro: 'GEMINI_API_KEY', valor: geminiKey });
        if (openaiKey !== undefined) await Parametro.upsert({ parametro: 'OPENAI_API_KEY', valor: openaiKey });

        if (iaConfig) {
            await Parametro.upsert({ parametro: 'IA_CONFIG', valor: JSON.stringify(iaConfig) });
        }
        return { message: "Configuración actualizada correctamente." };
    }

    async saveParameter(parametro, valor) {
        await Parametro.upsert({ parametro, valor });
        return { message: "Parámetro guardado correctamente." };
    }

    async deleteParameter(key) {
        const deleted = await Parametro.destroy({ where: { parametro: key } });
        if (!deleted) throw new Error("Parámetro no encontrado");
        return { message: "Parámetro eliminado." };
    }

    // --- Lógica de Templates ---

    moveTemplate(filePath) {
        const rootDir = getRootDir();
        const templateDir = path.join(rootDir, 'uploads', 'templates');
        if (!fs.existsSync(templateDir)) fs.mkdirSync(templateDir, { recursive: true });

        const templatePath = path.join(templateDir, 'plantilla_presupuesto.docx');
        // fs.renameSync falla entre dispositivos (EXDEV) en Docker si movemos de un volumen a una carpeta del contenedor.
        // Usamos copy + unlink para evitar esto.
        fs.copyFileSync(filePath, templatePath);
        fs.unlinkSync(filePath);
        return { message: 'Plantilla de presupuesto actualizada con éxito.' };
    }

    getSampleTemplatePath() {
        const rootDir = getRootDir();
        let templatePath = path.join(rootDir, 'uploads', 'doc', 'plantilla_ejemplo.docx');

        if (!fs.existsSync(templatePath)) {
            templatePath = path.join(rootDir, 'uploads', 'templates', 'ejemplo_base.docx');
        }

        if (!fs.existsSync(templatePath)) {
            throw new Error('La plantilla de ejemplo no se ha generado.');
        }
        return templatePath;
    }
}

module.exports = new AdminService();
