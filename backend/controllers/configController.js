const { Parametro } = require('../../models/mysql_models');
const path = require('path');
const fs = require('fs');

exports.getConfig = async (req, res) => {
    try {
        const params = await Parametro.findAll();
        const config = {};
        params.forEach(p => config[p.parametro] = p.valor);
        res.json(config);
    } catch (error) {
        console.error("Error fetching config:", error);
        res.status(500).json({ error: "Error al obtener configuración." });
    }
};

exports.updateConfig = async (req, res) => {
    try {
        const { GEMINI_API_KEY, OPENAI_API_KEY, IA_CONFIG } = req.body;

        if (GEMINI_API_KEY !== undefined) await Parametro.upsert({ parametro: 'GEMINI_API_KEY', valor: GEMINI_API_KEY });
        if (OPENAI_API_KEY !== undefined) await Parametro.upsert({ parametro: 'OPENAI_API_KEY', valor: OPENAI_API_KEY });

        if (IA_CONFIG) {
            await Parametro.upsert({ parametro: 'IA_CONFIG', valor: JSON.stringify(IA_CONFIG) });
        }

        res.json({ message: "Configuración actualizada correctamente." });
    } catch (error) {
        console.error("Error updating config:", error);
        res.status(500).json({ error: "Error al actualizar configuración." });
    }
};

exports.saveParameter = async (req, res) => {
    try {
        const { parametro, valor } = req.body;
        if (!parametro) return res.status(400).json({ error: "El nombre del parámetro es requerido." });

        await Parametro.upsert({ parametro, valor });
        res.json({ message: "Parámetro guardado correctamente." });
    } catch (error) {
        console.error("Error saving parameter:", error);
        res.status(500).json({ error: "Error al guardar parámetro." });
    }
};

exports.deleteParameter = async (req, res) => {
    try {
        const { key } = req.params;
        const deleted = await Parametro.destroy({ where: { parametro: key } });
        if (deleted) {
            res.json({ message: "Parámetro eliminado." });
        } else {
            res.status(404).json({ error: "Parámetro no encontrado." });
        }
    } catch (error) {
        console.error("Error deleting parameter:", error);
        res.status(500).json({ error: "Error al eliminar parámetro." });
    }
};

exports.uploadTemplate = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se subió ningún archivo.' });
    }
    // Mover a una ubicación fija para uso posterior
    // Nota: __dirname aquí será backend/controllers, necesitamos subir al root
    const rootDir = path.resolve(__dirname, '..', '..');
    const templateDir = path.join(rootDir, 'uploads', 'templates');
    if (!fs.existsSync(templateDir)) fs.mkdirSync(templateDir, { recursive: true });

    const templatePath = path.join(templateDir, 'plantilla_presupuesto.docx');
    fs.renameSync(req.file.path, templatePath);
    res.json({ message: 'Plantilla de presupuesto actualizada con éxito.' });
};

exports.downloadSampleTemplate = (req, res) => {
    const rootDir = path.resolve(__dirname, '..', '..');
    let templatePath = path.join(rootDir, 'uploads', 'doc', 'plantilla_ejemplo.docx');

    if (!fs.existsSync(templatePath)) {
        templatePath = path.join(rootDir, 'uploads', 'templates', 'ejemplo_base.docx');
    }

    if (!fs.existsSync(templatePath)) {
        return res.status(404).json({ error: 'La plantilla de ejemplo no se ha generado.' });
    }

    res.download(templatePath, 'Plantilla_Ejemplo_Cotizador.docx');
};
