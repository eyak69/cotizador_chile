const QuoteProcessingService = require('../services/QuoteProcessingService');
const { Cotizacion, DetalleCotizacion } = require('../../models/mysql_models');
const fs = require('fs');
const path = require('path');

exports.processUpload = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo PDF.' });

        console.log(`Procesando archivo subido: ${req.file.originalname}`);

        const loteId = req.headers['x-lote-id'] || req.body.loteId;
        const fileMd5 = req.headers['x-file-md5'] || null;

        // --- CACHÉ POR MD5: Si el mismo PDF ya fue procesado recientemente, no llamar a Gemini ---
        let quoteData = null;
        let isCacheHit = false;
        let cachedRutaArchivo = null;

        if (fileMd5) {
            try {
                const hace72h = new Date(Date.now() - 72 * 60 * 60 * 1000);
                const cached = await Cotizacion.findOne({
                    where: { userId: req.user.id },
                    include: [{
                        model: DetalleCotizacion,
                        as: 'detalles',
                        where: { file_md5: fileMd5 }
                    }],
                    order: [['createdAt', 'DESC']]
                });

                if (cached && cached.detalles && cached.detalles.length > 0 && new Date(cached.createdAt) > hace72h) {
                    console.log(`⚡ CACHÉ HIT: MD5 ${fileMd5} encontrado en DB. Reconstruyendo respuesta IA sin consumir tokens...`);

                    // Reconstruir el objeto quoteData tal cual lo devolvería Gemini
                    quoteData = {
                        asegurado: cached.asegurado,
                        vehiculo: cached.vehiculo,
                        comparativa_seguros: cached.detalles.map(d => ({
                            compania: d.compania,
                            plan: d.plan,
                            paginas_encontradas: d.paginas_encontradas ? d.paginas_encontradas.split(',') : [],
                            primas: {
                                uf_3: d.prima_uf3,
                                uf_5: d.prima_uf5,
                                uf_10: d.prima_uf10
                            },
                            caracteristicas: {
                                rc: d.rc_monto,
                                taller_marca: d.taller_marca,
                                reposicion_nuevo_meses: d.reposicion_meses,
                                otros_beneficios: d.observaciones
                            }
                        }))
                    };
                    isCacheHit = true;
                    if (cached.detalles && cached.detalles.length > 0) {
                        cachedRutaArchivo = cached.detalles[0].rutaArchivo;
                    }

                    // Limpiar el archivo subido temporario original
                    try { fs.unlinkSync(req.file.path); } catch (e) { /* ignorar */ }
                }
            } catch (cacheErr) {
                // La columna file_md5 puede no existir aún (sync pendiente) — ignorar y procesar normal
                if (cacheErr.original?.code === 'ER_BAD_FIELD_ERROR') {
                    console.warn('⚠️ Caché MD5 no disponible aún (columna pendiente de migración). Procesando normal.');
                } else {
                    throw cacheErr;
                }
            }
        }
        // --- FIN CACHÉ ---

        // 1. Identificar Empresa (siempre es necesario para guardar DetalleCotizacion en upload final)
        const { selectedEmpresa, pagesToKeep } = await QuoteProcessingService.identifyCompany(req.file.originalname, req.body.companyId, req.user.id);

        let optimizedPath = null;
        let retryOptimizedPath = null;
        let isUfCero = false;

        // Sólo llamar a Gemini si NO HUBO CACHÉ
        if (!isCacheHit) {
            // 2. Optimizar PDF si es necesario
            const optimResult = await QuoteProcessingService.optimizePdf(req.file.path, pagesToKeep, req.user.id, loteId);
            optimizedPath = optimResult.optimizedPath;

            const pathForAI = optimizedPath || req.file.path;

            // 3. Configuración IA
            const aiConfig = await QuoteProcessingService.getAIConfiguration(req.user.id);

            // 4. Llamada IA
            quoteData = await QuoteProcessingService.processWithAI(pathForAI, req.file.originalname, aiConfig, selectedEmpresa);

            // --- REINTENTO AUTOMÁTICO SI HAY VALORES EN 0 ---
            if (!isCacheHit) {
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

                    // 3. Configuración IA ya se trajo arriba, reutilizamos
                    const aiConfig = await QuoteProcessingService.getAIConfiguration(req.user.id);
                    quoteData = await QuoteProcessingService.processWithAI(retryPathForAI, req.file.originalname, aiConfig, selectedEmpresa);
                    console.log("✅ Reintento de IA finalizado.");
                }
            }
            // --- FIN REINTENTO ---

            // Determinar qué archivo físico existe para mover a final (fallback defensivo).
            // En paralelo puede ocurrir que req.file.path ya no esté por limpieza de otra request.
            let pathForFinal = req.file.path;
            let finalRelativePath = null;

            if (!isCacheHit) {
                const candidatePaths = [req.file.path, retryOptimizedPath, optimizedPath].filter(Boolean);
                pathForFinal = candidatePaths.find(p => fs.existsSync(p));

                console.log(`📁 Candidatos para final:`);
                candidatePaths.forEach(p => console.log(`   ${fs.existsSync(p) ? '✅' : '❌'} ${path.basename(p)}`))

            }

            // Mover archivo final para historial solo si no hubo caché. 
            // Si hubo caché, file.path ya se borró al inicio, no nos preocupamos
            finalRelativePath = await QuoteProcessingService.moveFileToFinal(pathForFinal, req.file.originalname, loteId, req.user.id);
        } else {
            // Reutilizar la ruta original del PDF guardado y cacheado
            finalRelativePath = cachedRutaArchivo || ('cache_hit_' + req.file.originalname);
        }

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
        const nuevaCotizacion = await QuoteProcessingService.saveQuoteToDB(quoteData, loteId, selectedEmpresa, finalRelativePath, req.user.id, isUfCero, fileMd5);
        console.log('Cotización guardada en MySQL ID:', nuevaCotizacion.id);

        const optimizationSuggestion = nuevaCotizacion.getDataValue('optimization_suggestion');

        // 7. Respuesta
        const cotizacionCompleta = await Cotizacion.findByPk(nuevaCotizacion.id, {
            include: [{ model: DetalleCotizacion, as: 'detalles' }]
        });

        res.json({
            ...cotizacionCompleta.toJSON(),
            raw_ai_response: quoteData,
            optimization_suggestion: optimizationSuggestion,
            _cache_hit: isCacheHit
        });

    } catch (error) {
        console.error('Error en uploadController:', error);
        // Enviar un mensaje de error genérico al backend, protegiendo las rutas internas / datos.
        res.status(500).json({ error: 'Ocurrió un error interno al procesar la cotización. Contacta con soporte técnico.' });
    }
};
