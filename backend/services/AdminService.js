const { Empresa, Parametro } = require('../../models/mysql_models');
const path = require('path');
const fs = require('fs');

const getRootDir = () => path.resolve(__dirname, '..', '..');

class AdminService {

    // ─── Empresas (por usuario) ────────────────────────────────────────────────

    async getAllEmpresas(userId) {
        return await Empresa.findAll({ where: { userId } });
    }

    async createEmpresa(data, userId) {
        return await Empresa.create({
            nombre: data.nombre,
            prompt_reglas: data.prompt_reglas,
            paginas_procesamiento: data.paginas_procesamiento !== undefined ? data.paginas_procesamiento : 2,
            userId
        });
    }

    async updateEmpresa(id, data, userId) {
        const empresa = await Empresa.findOne({ where: { id, userId } });
        if (!empresa) throw new Error("Empresa no encontrada");

        if (data.nombre) empresa.nombre = data.nombre;
        if (data.prompt_reglas) empresa.prompt_reglas = data.prompt_reglas;
        if (data.paginas_procesamiento !== undefined) empresa.paginas_procesamiento = data.paginas_procesamiento;

        return await empresa.save();
    }

    async deleteEmpresa(id, userId) {
        const empresa = await Empresa.findOne({ where: { id, userId } });
        if (!empresa) throw new Error("Empresa no encontrada");
        return await empresa.destroy();
    }

    // ─── Configuración / Parámetros (por usuario) ─────────────────────────────

    async getConfig(userId) {
        const params = await Parametro.findAll({ where: { userId } });
        const config = {};
        params.forEach(p => config[p.parametro] = p.valor);

        // Versión del sistema
        try {
            const packageJson = require('../../package.json');
            config.system_version = packageJson.version;
        } catch (e) {
            config.system_version = 'Unknown';
        }

        return config;
    }

    async updateConfigKeys(geminiKey, openaiKey, iaConfig, userId) {
        if (geminiKey !== undefined) await this._upsertParam('GEMINI_API_KEY', geminiKey, userId);
        if (openaiKey !== undefined) await this._upsertParam('OPENAI_API_KEY', openaiKey, userId);
        if (iaConfig) await this._upsertParam('IA_CONFIG', JSON.stringify(iaConfig), userId);
        return { message: "Configuración actualizada correctamente." };
    }

    async saveParameter(parametro, valor, userId) {
        await this._upsertParam(parametro, valor, userId);
        return { message: "Parámetro guardado correctamente." };
    }

    async deleteParameter(key, userId) {
        const deleted = await Parametro.destroy({ where: { parametro: key, userId } });
        if (!deleted) throw new Error("Parámetro no encontrado");
        return { message: "Parámetro eliminado." };
    }

    // Helper de upsert per-user (ya que el PK ahora es id numérico)
    async _upsertParam(parametro, valor, userId) {
        const existing = await Parametro.findOne({ where: { parametro, userId } });
        if (existing) {
            existing.valor = valor;
            await existing.save();
        } else {
            await Parametro.create({ parametro, valor, userId });
        }
    }

    // ─── Templates (compartidos / por instancia de servidor) ──────────────────

    moveTemplate(filePath) {
        const rootDir = getRootDir();
        const templateDir = path.join(rootDir, 'uploads', 'templates');
        if (!fs.existsSync(templateDir)) fs.mkdirSync(templateDir, { recursive: true });

        const templatePath = path.join(templateDir, 'plantilla_presupuesto.docx');
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
