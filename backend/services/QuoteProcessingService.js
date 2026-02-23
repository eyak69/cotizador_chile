const { Cotizacion, DetalleCotizacion, Empresa, Parametro } = require('../../models/mysql_models');
const { interpretQuoteData: interpretQuoteGemini } = require('../utils/ai_interpreter');
// const { interpretQuoteData: interpretQuoteOpenAI } = require('../utils/ai_interpreter_openai'); // DESHABILITADO POR SOLICITUD USUARIO
const { PDFDocument } = require('pdf-lib');
const path = require('path');
const fs = require('fs');

const getRootDir = () => path.resolve(__dirname, '..', '..');

class QuoteProcessingService {

    async identifyCompany(fileName, manualCompanyId, userId) {
        let pagesToKeep = 2;
        let selectedEmpresa = null;

        try {
            if (manualCompanyId) {
                // Solo puede seleccionar empresas que le pertenecen
                selectedEmpresa = await Empresa.findOne({ where: { id: manualCompanyId, userId } });
                if (selectedEmpresa) {
                    if (selectedEmpresa.paginas_procesamiento != null) pagesToKeep = selectedEmpresa.paginas_procesamiento;
                    console.log(`🏢 Empresa seleccionada manualmente: ${selectedEmpresa.nombre} -> Límite páginas: ${pagesToKeep}`);
                }
            } else {
                const empresas = await Empresa.findAll({ where: { userId } });
                const fileNameUpper = fileName.toUpperCase();
                for (const emp of empresas) {
                    if (fileNameUpper.includes(emp.nombre.toUpperCase())) {
                        selectedEmpresa = emp;
                        if (emp.paginas_procesamiento != null) pagesToKeep = emp.paginas_procesamiento;
                        console.log(`🏢 Empresa detectada por nombre: ${emp.nombre} -> Límite páginas: ${pagesToKeep}`);
                        break;
                    }
                }
            }
        } catch (e) { console.error("Error identificando empresa:", e); }

        return { selectedEmpresa, pagesToKeep };
    }

    async optimizePdf(filePath, pagesConfig, userId, loteId) {
        const existingPdfBytes = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });
        const pageCount = pdfDoc.getPageCount();
        let optimizedPath = filePath;
        let wasOptimized = false;

        // Normalizar configuración a String
        const configStr = String(pagesConfig || "2").trim();
        let pageIndices = [];

        // Estrategia 1: Selección Específica (contiene , ; o -)
        if (configStr.includes(',') || configStr.includes(';') || configStr.includes('-')) {
            console.log(`📄 Procesando selección específica de páginas: "${configStr}"`);
            const parts = configStr.split(/[,;]+/);
            const uniqueIndices = new Set();

            for (const part of parts) {
                const cleanPart = part.trim();
                // Validar formato "N-M" o "N"
                if (cleanPart.includes('-')) {
                    // Rango "1-3"
                    const [start, end] = cleanPart.split('-').map(n => parseInt(n));
                    if (!isNaN(start) && !isNaN(end)) {
                        // Math.min para no pasarse del total, aunque el filtro posterior lo arregla
                        for (let i = start; i <= end; i++) uniqueIndices.add(i - 1);
                    }
                } else {
                    // Página individual "5"
                    const pageNum = parseInt(cleanPart);
                    if (!isNaN(pageNum)) uniqueIndices.add(pageNum - 1);
                }
            }
            // Filtrar válidos (dentro del rango del PDF) y ordenar
            pageIndices = Array.from(uniqueIndices)
                .filter(idx => idx >= 0 && idx < pageCount)
                .sort((a, b) => a - b);

            console.log(`✅ Índices parseados: ${JSON.stringify(pageIndices)} (Total PDF: ${pageCount})`);

        } else {
            // Estrategia 2: Legacy "Primeras N páginas" (o 0 para todo)
            const nPages = parseInt(configStr);
            console.log(`📄 Configuración simple: ${nPages === 0 ? 'TODAS las páginas' : 'Primeras ' + nPages + ' páginas'}`);

            if (!isNaN(nPages)) {
                if (nPages === 0) {
                    // 0 significa TODO el documento
                    for (let i = 0; i < pageCount; i++) pageIndices.push(i);
                } else if (nPages > 0) {
                    // Primeras N páginas
                    for (let i = 0; i < nPages; i++) {
                        if (i < pageCount) pageIndices.push(i);
                    }
                }
            }
        }

        // Si tenemos índices seleccionados y son menos que el total (o si es selección específica forzamos optimización)
        if (pageIndices.length > 0 && (pageIndices.length < pageCount || configStr.includes(','))) {
            console.log(`✂️ Creando PDF optimizado con ${pageIndices.length} páginas seleccionadas.`);
            const newPdf = await PDFDocument.create();
            const pages = await newPdf.copyPages(pdfDoc, pageIndices);
            pages.forEach(page => newPdf.addPage(page));

            const pdfBytes = await newPdf.save();
            const tempDir = path.join(getRootDir(), 'uploads', 'temp', String(userId), String(loteId));
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            optimizedPath = path.join(tempDir, `opt_${path.basename(filePath)}`);
            fs.writeFileSync(optimizedPath, pdfBytes);
            wasOptimized = true;
        } else {
            console.log("⚠️ No se requirió optimización (PDF original usado).");
        }

        return { optimizedPath, wasOptimized };
    }

    async getAIConfiguration(userId) {
        let activeModelId = 'gemini-1.5-flash';
        let activeProviderKey = 'google';
        let useModel = 'gemini-1.5-flash';
        let apiKey = "";
        let debugMode = true;

        try {
            // Buscar configuración del usuario actual
            const paramConfig = await Parametro.findOne({ where: { parametro: 'IA_CONFIG', userId } });
            if (paramConfig && paramConfig.valor) {
                const fullConfig = JSON.parse(paramConfig.valor);
                const iaConf = fullConfig.configuracion_ia;
                if (iaConf) {
                    activeModelId = iaConf.modelo_por_defecto;
                    for (const [provKey, provData] of Object.entries(iaConf.proveedores)) {
                        const foundModel = provData.modelos.find(m => m.modelo === activeModelId);
                        if (foundModel) {
                            activeProviderKey = provKey;
                            useModel = foundModel.modelo;
                            break;
                        }
                    }
                }
            }

            const keyMap = { 'google': 'GEMINI_API_KEY', 'openai': 'OPENAI_API_KEY' };
            const envVarName = keyMap[activeProviderKey];
            const paramKey = await Parametro.findOne({ where: { parametro: envVarName, userId } });
            if (paramKey) apiKey = paramKey.valor;

            // Fallback: leer key del .env si el user no tiene una configurada
            if (!apiKey && activeProviderKey === 'google') apiKey = process.env.GEMINI_API_KEY || '';

            const pDebug = await Parametro.findOne({ where: { parametro: 'DEBUG', userId } });
            if (pDebug && pDebug.valor === 'false') debugMode = false;

        } catch (dbError) {
            console.error("Error Config IA:", dbError);
        }

        return { activeProviderKey, useModel, apiKey, debugMode };
    }

    async processWithAI(filePath, originalName, aiConfig, selectedEmpresa) {
        // FORZADO: Usar siempre Gemini por ahora y ocultar OpenAI
        const interpreterFunction = interpretQuoteGemini;

        // Sobre-escribir configuración para asegurar Gemini
        aiConfig.activeProviderKey = 'google';
        if (!aiConfig.apiKey && aiConfig.useModel !== 'gemini-1.5-flash') {
            // Si faltara key, el interpreter la busca, pero aquí aseguramos el 'google'
        }

        const interpreterConfig = {
            apiKey: aiConfig.apiKey,
            modelName: aiConfig.useModel,
            specificPromptRules: selectedEmpresa ? selectedEmpresa.prompt_reglas : null,
            debugMode: aiConfig.debugMode
        };

        console.log(`Usando IA (FORZADO GEMINI): ${aiConfig.activeProviderKey} - Model: ${aiConfig.useModel}`);
        return await interpreterFunction(filePath, originalName, interpreterConfig);
    }

    async saveQuoteToDB(quoteData, loteId, selectedEmpresa, finalFileName, userId, forceOptimizationSuggestion = false) {
        let nuevaCotizacion;

        if (loteId) {
            nuevaCotizacion = await Cotizacion.findOne({ where: { loteId: loteId } });
        }

        if (nuevaCotizacion) {
            if (!nuevaCotizacion.asegurado && quoteData.asegurado) {
                await nuevaCotizacion.update({ asegurado: quoteData.asegurado, vehiculo: quoteData.vehiculo });
            }
        } else {
            nuevaCotizacion = await Cotizacion.create({
                asegurado: quoteData.asegurado,
                vehiculo: quoteData.vehiculo,
                loteId: loteId,
                userId: userId || null
            });
        }

        if (quoteData.comparativa_seguros && quoteData.comparativa_seguros.length > 0) {
            const detalles = quoteData.comparativa_seguros.map(c => ({
                compania: c.compania ? (typeof c.compania === 'object' ? JSON.stringify(c.compania) : c.compania) : null,
                plan: typeof c.plan === 'object' ? JSON.stringify(c.plan) : (c.plan || null),
                prima_uf3: c.primas?.uf_3 ? (typeof c.primas.uf_3 === 'object' ? JSON.stringify(c.primas.uf_3) : String(c.primas.uf_3)) : null,
                prima_uf5: c.primas?.uf_5 ? (typeof c.primas.uf_5 === 'object' ? JSON.stringify(c.primas.uf_5) : String(c.primas.uf_5)) : null,
                prima_uf10: c.primas?.uf_10 ? (typeof c.primas.uf_10 === 'object' ? JSON.stringify(c.primas.uf_10) : String(c.primas.uf_10)) : null,
                rc_monto: c.caracteristicas?.rc ? (typeof c.caracteristicas.rc === 'object' ? JSON.stringify(c.caracteristicas.rc) : String(c.caracteristicas.rc)) : null,
                taller_marca: c.caracteristicas?.taller_marca ? (typeof c.caracteristicas.taller_marca === 'object' ? JSON.stringify(c.caracteristicas.taller_marca) : String(c.caracteristicas.taller_marca)) : null,
                reposicion_meses: c.caracteristicas?.reposicion_nuevo_meses ? String(c.caracteristicas.reposicion_nuevo_meses) : (c.caracteristicas?.reposicion_0km ? String(c.caracteristicas.reposicion_0km) : null),
                paginas_encontradas: c.paginas_encontradas ? (Array.isArray(c.paginas_encontradas) ? c.paginas_encontradas.join(',') : String(c.paginas_encontradas)) : null,
                observaciones: typeof c.caracteristicas?.otros_beneficios === 'object' ? JSON.stringify(c.caracteristicas.otros_beneficios) : (c.caracteristicas?.otros_beneficios || null),
                CotizacionId: nuevaCotizacion.id,
                empresa_id: selectedEmpresa ? selectedEmpresa.id : null,
                // Y al final en saveQuoteToDB
                CotizacionId: nuevaCotizacion.id,
                empresa_id: selectedEmpresa ? selectedEmpresa.id : null,
                rutaArchivo: finalFileName
            }));

            const detallesAInsertar = [];
            for (const detalle of detalles) {
                const existe = await DetalleCotizacion.findOne({
                    where: { CotizacionId: detalle.CotizacionId, rutaArchivo: detalle.rutaArchivo }
                });
                if (!existe) detallesAInsertar.push(detalle);
            }

            if (detallesAInsertar.length > 0) await DetalleCotizacion.bulkCreate(detallesAInsertar);
        }

        // --- Lógica de Aprendizaje / Sugerencia de Optimización ---
        let optimization_suggestion = null;
        const triggerSuggestion = forceOptimizationSuggestion || (selectedEmpresa && (selectedEmpresa.paginas_procesamiento === '0' || selectedEmpresa.paginas_procesamiento === 0 || !selectedEmpresa.paginas_procesamiento));

        if (selectedEmpresa && triggerSuggestion) {
            // Recolectar todas las páginas encontradas en este lote para esta empresa
            const allFoundPages = new Set();
            if (quoteData.comparativa_seguros) {
                quoteData.comparativa_seguros.forEach(c => {
                    if (c.paginas_encontradas) {
                        const pages = Array.isArray(c.paginas_encontradas) ? c.paginas_encontradas : [c.paginas_encontradas];
                        pages.forEach(p => {
                            const pNum = parseInt(p);
                            if (!isNaN(pNum)) allFoundPages.add(pNum);
                        });
                    }
                });
            }

            if (allFoundPages.size > 0) {
                // Convertir a array ordenado
                const sortedPages = Array.from(allFoundPages).sort((a, b) => a - b);
                // Convertir a string formato "1,2,5" (o rangos si quisiéramos ser fancy, pero coma separada basta)
                const suggestedPagesStr = sortedPages.join(',');

                // Solo sugerir si lo encontrado es diferente a lo que la empresa ya tiene configurado
                // Si la empresa ya estaba configurada en "1" y la IA encontró "1", no sugerir re-guardar "1".
                if (suggestedPagesStr && String(selectedEmpresa.paginas_procesamiento) !== suggestedPagesStr) {
                    optimization_suggestion = {
                        companyId: selectedEmpresa.id,
                        companyName: selectedEmpresa.nombre,
                        currentPages: selectedEmpresa.paginas_procesamiento || '0',
                        suggestedPages: suggestedPagesStr,
                        message: `La IA detectó que la información útil de ${selectedEmpresa.nombre} se encuentra en las páginas ${suggestedPagesStr}.`
                    };
                }
            }
        }

        // Devolvemos la instancia y la sugerencia
        nuevaCotizacion.setDataValue('optimization_suggestion', optimization_suggestion);

        return nuevaCotizacion;
    }

    moveFileToFinal(tempPath, originalName, loteId, userId) {
        const rootDir = getRootDir();
        const finalUploadDir = path.join(rootDir, 'uploads', 'final', String(userId), String(loteId));
        if (!fs.existsSync(finalUploadDir)) fs.mkdirSync(finalUploadDir, { recursive: true });

        const finalPath = path.join(finalUploadDir, originalName);
        fs.copyFileSync(tempPath, finalPath);

        return `/uploads/final/${userId}/${loteId}/${originalName}`;
    }
}

module.exports = new QuoteProcessingService();
