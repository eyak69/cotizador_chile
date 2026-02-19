const AdminService = require('../services/AdminService');

exports.getConfig = async (req, res) => {
    try {
        const config = await AdminService.getConfig(req.user.id);
        res.json(config);
    } catch (error) {
        console.error("Error fetching config:", error);
        res.status(500).json({ error: "Error al obtener configuración." });
    }
};

exports.updateConfig = async (req, res) => {
    try {
        const { GEMINI_API_KEY, OPENAI_API_KEY, IA_CONFIG } = req.body;
        const result = await AdminService.updateConfigKeys(GEMINI_API_KEY, OPENAI_API_KEY, IA_CONFIG, req.user.id);
        res.json(result);
    } catch (error) {
        console.error("Error updating config:", error);
        res.status(500).json({ error: "Error al actualizar configuración." });
    }
};

exports.saveParameter = async (req, res) => {
    try {
        const { parametro, valor } = req.body;
        if (!parametro) return res.status(400).json({ error: "El nombre del parámetro es requerido." });

        const result = await AdminService.saveParameter(parametro, valor, req.user.id);
        res.json(result);
    } catch (error) {
        console.error("Error saving parameter:", error);
        res.status(500).json({ error: "Error al guardar parámetro." });
    }
};

exports.deleteParameter = async (req, res) => {
    try {
        const { key } = req.params;
        const result = await AdminService.deleteParameter(key, req.user.id);
        res.json(result);
    } catch (error) {
        console.error("Error deleting parameter:", error);
        const status = error.message === "Parámetro no encontrado" ? 404 : 500;
        res.status(status).json({ error: error.message || "Error al eliminar parámetro." });
    }
};

exports.uploadTemplate = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se subió ningún archivo.' });
    }
    try {
        const result = AdminService.moveTemplate(req.file.path);
        res.json(result);
    } catch (error) {
        console.error("Error subiendo plantilla:", error);
        res.status(500).json({ error: "Error al procesar plantilla." });
    }
};

exports.downloadSampleTemplate = (req, res) => {
    try {
        const templatePath = AdminService.getSampleTemplatePath();
        res.download(templatePath, 'Plantilla_Ejemplo_Cotizador.docx');
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
};
