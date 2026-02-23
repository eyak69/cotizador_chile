const { Cotizacion, DetalleCotizacion, CorrectionRule } = require('../../models/mysql_models');
const path = require('path');
const fs = require('fs');
const DocumentService = require('../services/DocumentService');

// Helper para paths
const getRootDir = () => path.resolve(__dirname, '..', '..');

exports.getQuotes = async (req, res) => {
    try {
        const userId = req.user.id;
        const quotes = await Cotizacion.findAll({
            where: { userId },
            include: [{ model: DetalleCotizacion, as: 'detalles' }],
            order: [['createdAt', 'DESC']]
        });
        res.json(quotes);
    } catch (error) {
        console.error("Error fetching quotes:", error);
        res.status(500).json({ error: "Error al obtener historial." });
    }
};

exports.deleteQuote = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const quote = await Cotizacion.findByPk(id, {
            include: [{ model: DetalleCotizacion, as: 'detalles' }]
        });

        if (!quote) return res.status(404).json({ error: "Cotización no encontrada" });
        if (quote.userId !== userId) return res.status(403).json({ error: "No tienes permiso para eliminar esta cotización." });

        // 1. Eliminar archivos físicos asociados
        const rootDir = getRootDir();

        // 1a. Eliminar rutaArchivos de Detalles
        if (quote.detalles && quote.detalles.length > 0) {
            quote.detalles.forEach(detalle => {
                if (detalle.rutaArchivo) {
                    const relativePath = detalle.rutaArchivo.startsWith('/') || detalle.rutaArchivo.startsWith('\\')
                        ? detalle.rutaArchivo.substring(1)
                        : detalle.rutaArchivo;

                    const filePath = path.join(rootDir, relativePath);
                    if (fs.existsSync(filePath)) {
                        try {
                            fs.unlinkSync(filePath);
                            console.log(`Archivo eliminado (detalle): ${filePath}`);
                        } catch (err) {
                            console.error(`Error eliminando archivo ${filePath}:`, err);
                        }
                    }
                }
            });
        }

        // 1b. Eliminar TODOS los archivos del lote en el directorio final
        if (quote.loteId) {
            const finalUploadDir = path.join(rootDir, 'uploads', 'final', String(userId));
            if (fs.existsSync(finalUploadDir)) {
                try {
                    const files = fs.readdirSync(finalUploadDir);
                    files.forEach(file => {
                        if (file.startsWith(quote.loteId + '-')) {
                            const filePath = path.join(finalUploadDir, file);
                            if (fs.existsSync(filePath)) {
                                try {
                                    fs.unlinkSync(filePath);
                                    console.log(`Archivo asociado al lote eliminado: ${filePath}`);
                                } catch (e) {
                                    console.error(`Error eliminando archivo de lote ${filePath}:`, e);
                                }
                            }
                        }
                    });
                } catch (dirErr) {
                    console.error("Error leyendo directorio final para limpieza de lote:", dirErr);
                }
            }
        }

        await DetalleCotizacion.destroy({ where: { CotizacionId: id } });
        await quote.destroy();

        res.json({ message: "Cotización y archivos eliminados correctamente." });

    } catch (error) {
        console.error("Error deleting quote:", error);
        res.status(500).json({ error: "Error al eliminar la cotización." });
    }
};

exports.updateQuoteDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const { plan, prima_uf3, prima_uf5, prima_uf10, taller_marca, rc_monto, observaciones, learn } = req.body;

        const detalle = await DetalleCotizacion.findByPk(id);
        if (!detalle) return res.status(404).json({ error: "Detalle no encontrado." });

        const previousValues = {
            plan: detalle.plan,
            prima_uf3: detalle.prima_uf3,
            prima_uf5: detalle.prima_uf5,
            prima_uf10: detalle.prima_uf10,
            taller_marca: detalle.taller_marca,
            rc_monto: detalle.rc_monto
        };

        if (plan !== undefined) detalle.plan = plan;
        if (prima_uf3 !== undefined) detalle.prima_uf3 = prima_uf3;
        if (prima_uf5 !== undefined) detalle.prima_uf5 = prima_uf5;
        if (prima_uf10 !== undefined) detalle.prima_uf10 = prima_uf10;
        if (taller_marca !== undefined) detalle.taller_marca = taller_marca;
        if (rc_monto !== undefined) detalle.rc_monto = rc_monto;
        if (observaciones !== undefined) detalle.observaciones = observaciones;

        await detalle.save();

        if (learn && detalle.empresa_id) {
            console.log(`🧠 APRENDIZAJE ACTIVADO para Empresa ID: ${detalle.empresa_id}`);
            const fieldsToCheck = [
                { key: 'plan', dbField: 'plan' },
                { key: 'prima_uf3', dbField: 'primas.uf_3' },
                { key: 'prima_uf5', dbField: 'primas.uf_5' },
                { key: 'prima_uf10', dbField: 'primas.uf_10' },
                { key: 'taller_marca', dbField: 'caracteristicas.taller_marca' },
                { key: 'rc_monto', dbField: 'caracteristicas.rc' }
            ];

            const rulesToCreate = [];
            fieldsToCheck.forEach(field => {
                const newValue = req.body[field.key];
                const oldValue = previousValues[field.key];
                const normalize = (val) => (val === null || val === undefined) ? '' : String(val).trim();
                const valIncorrecto = normalize(oldValue);
                const valCorrecto = normalize(newValue);

                if (valIncorrecto !== valCorrecto && valIncorrecto !== '' && valCorrecto !== '') {
                    console.log(`  -> Detectada corrección en '${field.key}': '${valIncorrecto}' => '${valCorrecto}'`);
                    rulesToCreate.push({
                        empresa_id: detalle.empresa_id,
                        campo: field.dbField,
                        valor_incorrecto: valIncorrecto,
                        valor_correcto: valCorrecto
                    });
                }
            });

            if (rulesToCreate.length > 0) {
                await CorrectionRule.bulkCreate(rulesToCreate);
                console.log(`  ✅ ${rulesToCreate.length} reglas de corrección aprendidas.`);
            }
        }

        res.json({ message: "Detalle actualizado.", detalle });

    } catch (error) {
        console.error("Error updating quote detail:", error);
        res.status(500).json({ error: "Error al actualizar detalle." });
    }
};

exports.downloadExcel = async (req, res) => {
    try {
        const { id } = req.params;
        const quote = await Cotizacion.findByPk(id, {
            include: [{ model: DetalleCotizacion, as: 'detalles' }]
        });

        if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });

        const fileName = `Cotizacion-${id}.xlsx`;
        // Delegar generación a DocumentService
        const filePath = await DocumentService.generateExcel(quote, fileName, req.user.id);

        res.download(filePath, fileName, (err) => {
            if (err) console.error("Error descarga Excel:", err);
            // Opcional: fs.unlinkSync(filePath); // Limpiar temp
        });

    } catch (error) {
        console.error("Error generating Excel:", error);
        res.status(500).json({ error: "Error al generar Excel: " + error.message });
    }
};

exports.downloadWord = async (req, res) => {
    try {
        const { id } = req.params;
        const quote = await Cotizacion.findByPk(id, {
            include: [{ model: DetalleCotizacion, as: 'detalles' }]
        });

        if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });

        // Preparar Datos para DocumentService
        const data = {
            cliente: quote.asegurado || '',
            fecha: new Date(quote.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/-/g, '/'),
            vehiculo: quote.vehiculo || '',
            detalles: quote.detalles.map(d => ({
                compania: d.compania,
                plan: d.plan,
                prima_uf3: d.prima_uf3 || '-',
                prima_uf5: d.prima_uf5 || '-',
                prima_uf10: d.prima_uf10 || '-',
                rc: d.rc_monto || '-',
                taller: d.taller_marca || '-',

                // Campos adicionales solicitados
                rc_tipo: d.rc_tipo || '-',
                reposicion_meses: d.reposicion_meses || '-',
                observaciones: d.observaciones || ''
            }))
        };

        const fileName = `Presupuesto_${id}.docx`;
        // Delegar generación a DocumentService
        const filePath = await DocumentService.generateWord(data, 'plantilla_presupuesto.docx', fileName, req.user.id);

        res.download(filePath, fileName, (err) => {
            if (err) console.error("Error descarga Word:", err);
        });

    } catch (error) {
        console.error("Error procesando Word (Docxtemplater):", error);
        res.status(500).json({ error: "Error interno al generar documento.", details: error.message });
    }
};
