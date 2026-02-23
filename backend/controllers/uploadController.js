const QuoteProcessingService = require('../services/QuoteProcessingService');
const { Cotizacion, DetalleCotizacion } = require('../../models/mysql_models');
const fs = require('fs');
const path = require('path');

exports.processUpload = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo PDF.' });

        console.log(`Procesando archivo subido: ${req.file.originalname}`);

        // 1. Identificar Empresa
        const { selectedEmpresa, pagesToKeep } = await QuoteProcessingService.identifyCompany(req.file.originalname, req.body.companyId, req.user.id);

        const loteId = req.headers['x-lote-id'] || req.body.loteId;

        // 2. Optimizar PDF si es necesario
        const { optimizedPath, wasOptimized } = await QuoteProcessingService.optimizePdf(req.file.path, pagesToKeep, req.user.id, loteId);
        const pathForAI = optimizedPath || req.file.path;

        // 3. Configuración IA
        const aiConfig = await QuoteProcessingService.getAIConfiguration(req.user.id);

        // 4. Llamada IA
        let quoteData = await QuoteProcessingService.processWithAI(pathForAI, req.file.originalname, aiConfig, selectedEmpresa);

        // --- REINTENTO AUTOMÁTICO SI HAY VALORES EN 0 ---
        let isUfCero = false;
        if (quoteData && quoteData.comparativa_seguros && quoteData.comparativa_seguros.length > 0) {
            // Revisamos si alguna de las opciones arrojó $0 o UF 0 en todas sus primas (lo que indica que la IA no encontró la tabla)
            isUfCero = quoteData.comparativa_seguros.some(opcion => {
                const p3 = parseFloat(opcion.primas?.uf_3) || 0;
                const p5 = parseFloat(opcion.primas?.uf_5) || 0;
                const p10 = parseFloat(opcion.primas?.uf_10) || 0;
                return (p3 + p5 + p10) === 0;
            });
        }

        if (isUfCero && String(pagesToKeep) !== "0") {
            console.log("🚨 ALERTA: La IA devolvió Prima UF = 0. Posible error de páginas cortadas (se esperaban valores en la página configurada). Iniciando REINTENTO con documento completo (páginas=0)...");

            // Re-optimizar con configuración "0" (Todo el documento)
            const retryOpt = await QuoteProcessingService.optimizePdf(req.file.path, "0", req.user.id, loteId);
            const retryPathForAI = retryOpt.optimizedPath || req.file.path;

            // Segunda llamada a la IA con el documento extendido
            quoteData = await QuoteProcessingService.processWithAI(retryPathForAI, req.file.originalname, aiConfig, selectedEmpresa);

            // MAGIA: Para emitir la "Sugerencia de Optimización" en la UI, simulamos en memoria
            // que la empresa estaba configurada en "0" desde el inicio. Así el backend le dirá al
            // frontend qué páginas son realmente útiles para guardarlas.
            if (selectedEmpresa) {
                selectedEmpresa.paginas_procesamiento = "0";
            }

            console.log("✅ Reintento de IA finalizado.");
        }
        // --- FIN REINTENTO ---

        // Mover archivo final para historial (Siempre)
        const finalRelativePath = await QuoteProcessingService.moveFileToFinal(req.file.path, req.file.originalname, loteId, req.user.id);

        // Guardar la nueva cotización (se movió dentro de la DB la ruta final de MoveFileToFinal)

        // Limpieza de Temporales Incondicional (Solicitado por usuario)
        console.log("🧹 Limpiando toda la carpeta temporal de este lote incondicionalmente...");
        const tempDir = path.join(__dirname, '..', '..', 'uploads', 'temp', String(req.user.id), String(loteId));
        if (fs.existsSync(tempDir)) {
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
                console.log(`Carpeta temporal eliminada: ${tempDir}`);
            } catch (err) {
                console.error(`Error borrando carpeta temp ${tempDir}:`, err.message);
            }
        }


        // 5. Validar Errores IA
        if (quoteData.asegurado === "Error de Lectura" || (quoteData.vehiculo && quoteData.vehiculo.startsWith("ERROR:"))) {
            console.log("Se detectó error en la IA, saltando guardado en DB.");
            return res.json(quoteData);
        }

        // 6. Guardar en DB
        const nuevaCotizacion = await QuoteProcessingService.saveQuoteToDB(quoteData, loteId, selectedEmpresa, finalRelativePath, req.user.id);
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
        // Enviar un mensaje de error genérico al backend, protegiendo las rutas internas / datos.
        res.status(500).json({ error: 'Ocurrió un error interno al procesar la cotización. Contacta con soporte técnico.' });
    }
};
