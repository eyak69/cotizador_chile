const AdminService = require('../services/AdminService');

exports.getEmpresas = async (req, res) => {
    try {
        const empresas = await AdminService.getAllEmpresas();
        res.json(empresas);
    } catch (error) {
        console.error("Error fetching empresas:", error);
        res.status(500).json({ error: "Error al obtener empresas." });
    }
};

exports.createEmpresa = async (req, res) => {
    try {
        const { nombre, prompt_reglas } = req.body;
        if (!nombre || !prompt_reglas) {
            return res.status(400).json({ error: "Nombre y reglas son requeridos." });
        }
        const nuevaEmpresa = await AdminService.createEmpresa(req.body);
        res.json(nuevaEmpresa);
    } catch (error) {
        console.error("Error creating empresa:", error);
        res.status(500).json({ error: "Error al crear empresa." });
    }
};

exports.updateEmpresa = async (req, res) => {
    try {
        const { id } = req.params;
        const empresa = await AdminService.updateEmpresa(id, req.body);
        res.json(empresa);
    } catch (error) {
        console.error("Error updating empresa:", error);
        const status = error.message === "Empresa no encontrada" ? 404 : 500;
        res.status(status).json({ error: error.message || "Error al actualizar empresa." });
    }
};

exports.deleteEmpresa = async (req, res) => {
    try {
        const { id } = req.params;
        await AdminService.deleteEmpresa(id);
        res.json({ message: "Empresa eliminada correctamente." });
    } catch (error) {
        console.error("Error deleting empresa:", error);
        const status = error.message === "Empresa no encontrada" ? 404 : 500;
        res.status(status).json({ error: error.message || "Error al eliminar empresa." });
    }
};
