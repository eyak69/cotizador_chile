const QuoteProcessingService = require('../services/QuoteProcessingService');
const { Cotizacion, DetalleCotizacion } = require('../../models/mysql_models');
const fs = require('fs');

exports.processUpload = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo PDF.' });

        console.log(`Procesando archivo subido: ${req.file.originalname}`);

        // 1. Identificar Empresa
        const { selectedEmpresa, pagesToKeep } = await QuoteProcessingService.identifyCompany(req.file.originalname, req.body.companyId);

        // 2. Optimizar PDF si es necesario
        const { optimizedPath, wasOptimized } = await QuoteProcessingService.optimizePdf(req.file.path, pagesToKeep);
        const pathForAI = optimizedPath;

        // 3. Configuración IA
        const aiConfig = await QuoteProcessingService.getAIConfiguration();

        // 4. Llamada IA
        const quoteData = await QuoteProcessingService.processWithAI(pathForAI, req.file.originalname, aiConfig, selectedEmpresa);

        // Limpieza Temporales
        if (wasOptimized && fs.existsSync(optimizedPath)) {
            try { fs.unlinkSync(optimizedPath); } catch (e) { }
        }

        // Mover archivo final (incluso si IA falla, podríamos querer guardarlo? No, lógica original guarda. Haremos igual)
        // La lógica original guardaba ANTES de checkear error.

        const loteId = req.body.loteId;
        const finalFileName = QuoteProcessingService.moveFileToFinal(req.file.path, req.file.originalname, loteId);

        // Clean original upload
        try { fs.unlinkSync(req.file.path); } catch (e) { }


        // 5. Validar Errores IA
        if (quoteData.asegurado === "Error de Lectura" || (quoteData.vehiculo && quoteData.vehiculo.startsWith("ERROR:"))) {
            console.log("Se detectó error en la IA, saltando guardado en DB.");
            return res.json(quoteData);
        }

        // 6. Guardar en DB
        const nuevaCotizacion = await QuoteProcessingService.saveQuoteToDB(quoteData, loteId, selectedEmpresa, finalFileName);
        console.log('Cotización guardada en MySQL ID:', nuevaCotizacion.id);

        // 7. Respuesta
        const cotizacionCompleta = await Cotizacion.findByPk(nuevaCotizacion.id, {
            include: [{ model: DetalleCotizacion, as: 'detalles' }]
        });

        res.json({
            ...cotizacionCompleta.toJSON(),
            raw_ai_response: quoteData
        });

    } catch (error) {
        console.error('Error en uploadController:', error);
        res.status(500).json({ error: 'Ocurrió un error al procesar la cotización.', details: error.message });
    }
};
