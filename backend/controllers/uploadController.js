const QuoteProcessingService = require('../services/QuoteProcessingService');
const { Cotizacion, DetalleCotizacion } = require('../../models/mysql_models');
const fs = require('fs');

exports.processUpload = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo PDF.' });

        console.log(`Procesando archivo subido: ${req.file.originalname}`);

        // 1. Identificar Empresa
        const { selectedEmpresa, pagesToKeep } = await QuoteProcessingService.identifyCompany(req.file.originalname, req.body.companyId, req.user.id);

        // 2. Optimizar PDF si es necesario
        const { optimizedPath, wasOptimized } = await QuoteProcessingService.optimizePdf(req.file.path, pagesToKeep);
        const pathForAI = optimizedPath;

        // 3. Configuración IA
        const aiConfig = await QuoteProcessingService.getAIConfiguration(req.user.id);

        // 4. Llamada IA
        const quoteData = await QuoteProcessingService.processWithAI(pathForAI, req.file.originalname, aiConfig, selectedEmpresa);

        // Mover archivo final para historial (Siempre)
        const loteId = req.body.loteId;
        const finalFileName = QuoteProcessingService.moveFileToFinal(req.file.path, req.file.originalname, loteId, req.user.id);

        // Limpieza Temporales Condicional (Según DEBUG)
        if (!aiConfig.debugMode) {
            console.log("🧹 DEBUG=false: Limpiando archivos temporales...");

            // Borrar PDF optimizado si se creó
            if (wasOptimized && fs.existsSync(optimizedPath)) {
                try { fs.unlinkSync(optimizedPath); } catch (e) { console.error("Error borrando opt:", e); }
            }

            // Borrar PDF original subido (ya se movió copia a /final)
            if (req.file && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path); } catch (e) { console.error("Error borrando temp:", e); }
            }
        } else {
            console.log("🐞 DEBUG=true: Archivos temporales conservados en /uploads/temp/");
        }


        // 5. Validar Errores IA
        if (quoteData.asegurado === "Error de Lectura" || (quoteData.vehiculo && quoteData.vehiculo.startsWith("ERROR:"))) {
            console.log("Se detectó error en la IA, saltando guardado en DB.");
            return res.json(quoteData);
        }

        // 6. Guardar en DB
        const nuevaCotizacion = await QuoteProcessingService.saveQuoteToDB(quoteData, loteId, selectedEmpresa, finalFileName, req.user.id);
        console.log('Cotización guardada en MySQL ID:', nuevaCotizacion.id);

        const optimizationSuggestion = nuevaCotizacion.getDataValue('optimization_suggestion');

        // 7. Respuesta
        const cotizacionCompleta = await Cotizacion.findByPk(nuevaCotizacion.id, {
            include: [{ model: DetalleCotizacion, as: 'detalles' }]
        });

        res.json({
            ...cotizacionCompleta.toJSON(),
            raw_ai_response: quoteData,
            optimization_suggestion: optimizationSuggestion
        });

    } catch (error) {
        console.error('Error en uploadController:', error);
        res.status(500).json({ error: 'Ocurrió un error al procesar la cotización.', details: error.message });
    }
};
