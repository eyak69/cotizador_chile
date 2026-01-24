const { Empresa } = require('../../models/mysql_models');

/**
 * Obtener todas las empresas
 */
exports.getEmpresas = async (req, res) => {
    try {
        const empresas = await Empresa.findAll();
        res.json(empresas);
    } catch (error) {
        console.error("Error fetching empresas:", error);
        res.status(500).json({ error: "Error al obtener empresas." });
    }
};

/**
 * Crear nueva empresa
 */
exports.createEmpresa = async (req, res) => {
    try {
        const { nombre, prompt_reglas, paginas_procesamiento } = req.body;
        if (!nombre || !prompt_reglas) {
            return res.status(400).json({ error: "Nombre y reglas son requeridos." });
        }
        const nuevaEmpresa = await Empresa.create({
            nombre,
            prompt_reglas,
            paginas_procesamiento: paginas_procesamiento !== undefined ? paginas_procesamiento : 2
        });
        res.json(nuevaEmpresa);
    } catch (error) {
        console.error("Error creating empresa:", error);
        res.status(500).json({ error: "Error al crear empresa." });
    }
};

/**
 * Actualizar empresa
 */
exports.updateEmpresa = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, prompt_reglas } = req.body;
        const empresa = await Empresa.findByPk(id);

        if (!empresa) return res.status(404).json({ error: "Empresa no encontrada." });

        if (nombre) empresa.nombre = nombre;
        if (prompt_reglas) empresa.prompt_reglas = prompt_reglas;
        if (req.body.paginas_procesamiento !== undefined) empresa.paginas_procesamiento = req.body.paginas_procesamiento;

        await empresa.save();
        res.json(empresa);
    } catch (error) {
        console.error("Error updating empresa:", error);
        res.status(500).json({ error: "Error al actualizar empresa." });
    }
};

/**
 * Eliminar empresa
 */
exports.deleteEmpresa = async (req, res) => {
    try {
        const { id } = req.params;
        const empresa = await Empresa.findByPk(id);
        if (!empresa) return res.status(404).json({ error: "Empresa no encontrada." });

        await empresa.destroy();
        res.json({ message: "Empresa eliminada correctamente." });
    } catch (error) {
        console.error("Error deleting empresa:", error);
        res.status(500).json({ error: "Error al eliminar empresa." });
    }
};
