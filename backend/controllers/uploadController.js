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
        let retryOptimizedPath = null; // Guardamos para limpiar después
        if (quoteData && quoteData.comparativa_seguros && quoteData.comparativa_seguros.length > 0) {
            // Revisamos si alguna de las opciones arrojó $0 o UF 0 en todas sus primas
            isUfCero = quoteData.comparativa_seguros.some(opcion => {
                const p3 = parseFloat(opcion.primas?.uf_3) || 0;
                const p5 = parseFloat(opcion.primas?.uf_5) || 0;
                const p10 = parseFloat(opcion.primas?.uf_10) || 0;
                return (p3 + p5 + p10) === 0;
            });
        }

        if (isUfCero && String(pagesToKeep) !== "0") {
            console.log("🚨 ALERTA: La IA devolvió Prima UF = 0. Iniciando REINTENTO con documento completo...");
            await new Promise(resolve => setTimeout(resolve, 2000));

            const retryOpt = await QuoteProcessingService.optimizePdf(req.file.path, "0", req.user.id, loteId);
            retryOptimizedPath = retryOpt.optimizedPath; // guardar para limpiar luego
            const retryPathForAI = retryOptimizedPath || req.file.path;
            quoteData = await QuoteProcessingService.processWithAI(retryPathForAI, req.file.originalname, aiConfig, selectedEmpresa);
            console.log("✅ Reintento de IA finalizado.");
        }
        // --- FIN REINTENTO ---

        // Determinar qué archivo físico existe para mover a final (fallback defensivo).
        // En paralelo puede ocurrir que req.file.path ya no esté por limpieza de otra request.
        const candidatePaths = [req.file.path, retryOptimizedPath, optimizedPath].filter(Boolean);
        const pathForFinal = candidatePaths.find(p => fs.existsSync(p));

        console.log(`📁 Candidatos para final:`);
        candidatePaths.forEach(p => console.log(`   ${fs.existsSync(p) ? '✅' : '❌'} ${path.basename(p)}`))

        if (!pathForFinal) {
            throw new Error(`ENOENT preventivo: Ninguna copia del archivo existe antes de mover a final. Candidatos: ${candidatePaths.join(', ')}`);
        }

        // Mover archivo final para historial (Siempre)
        const finalRelativePath = await QuoteProcessingService.moveFileToFinal(pathForFinal, req.file.originalname, loteId, req.user.id);

        // Limpieza SELECTIVA — Solo los archivos de ESTA request.
        // ⚠️ NO borramos el directorio completo porque en procesamiento paralelo todos
        // los archivos del lote comparten el mismo tempDir. Borrar el dir eliminaría
        // los PDFs de otros archivos que aún se están procesando.
        console.log("🧹 Limpiando archivos temporales de esta request...");
        const filesToClean = [req.file.path, optimizedPath, retryOptimizedPath].filter(Boolean);
        for (const filePath of [...new Set(filesToClean)]) {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`  ✓ Eliminado: ${path.basename(filePath)}`);
                }
            } catch (err) {
                console.error(`  ✗ Error borrando ${path.basename(filePath)}:`, err.message);
            }
        }


        // 5. Validar Errores IA
        if (quoteData.asegurado === "Error de Lectura" || (quoteData.vehiculo && quoteData.vehiculo.startsWith("ERROR:"))) {
            console.log("Se detectó error en la IA, saltando guardado en DB.");
            return res.json(quoteData);
        }

        // 6. Guardar en DB (Forzar sugerencia de mitigación si hubo reintento isUfCero)
        const nuevaCotizacion = await QuoteProcessingService.saveQuoteToDB(quoteData, loteId, selectedEmpresa, finalRelativePath, req.user.id, isUfCero);
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
