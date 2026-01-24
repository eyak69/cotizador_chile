const { Cotizacion, DetalleCotizacion, Empresa, Parametro } = require('../../models/mysql_models');
const { interpretQuoteData: interpretQuoteGemini } = require('../utils/ai_interpreter');
const { interpretQuoteData: interpretQuoteOpenAI } = require('../utils/ai_interpreter_openai');
const { PDFDocument } = require('pdf-lib');
const path = require('path');
const fs = require('fs');

const getRootDir = () => path.resolve(__dirname, '..', '..');

class QuoteProcessingService {

    async identifyCompany(fileName, manualCompanyId) {
        let pagesToKeep = 2;
        let selectedEmpresa = null;

        try {
            if (manualCompanyId) {
                selectedEmpresa = await Empresa.findByPk(manualCompanyId);
                if (selectedEmpresa) {
                    if (selectedEmpresa.paginas_procesamiento != null) pagesToKeep = selectedEmpresa.paginas_procesamiento;
                    console.log(`🏢 Empresa seleccionada manualmente: ${selectedEmpresa.nombre} -> Límite páginas: ${pagesToKeep}`);
                }
            } else {
                const empresas = await Empresa.findAll();
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

    async optimizePdf(filePath, pagesToKeep) {
        const existingPdfBytes = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });
        const pageCount = pdfDoc.getPageCount();
        let optimizedPath = filePath;
        let wasOptimized = false;

        if (pagesToKeep > 0 && pageCount > pagesToKeep) {
            console.log(`📄 PDF Largo detectado (${pageCount} págs). Optimizando a ${pagesToKeep} páginas para IA...`);
            const newPdf = await PDFDocument.create();
            const pageIndices = [];
            for (let i = 0; i < pagesToKeep; i++) {
                if (i < pageCount) pageIndices.push(i);
            }
            const pages = await newPdf.copyPages(pdfDoc, pageIndices);
            pages.forEach(page => newPdf.addPage(page));

            const pdfBytes = await newPdf.save();
            optimizedPath = path.join(path.dirname(filePath), `opt_${path.basename(filePath)}`);
            fs.writeFileSync(optimizedPath, pdfBytes);
            wasOptimized = true;
        }

        return { optimizedPath, wasOptimized };
    }

    async getAIConfiguration() {
        let activeModelId = 'gemini-1.5-flash';
        let activeProviderKey = 'google';
        let useModel = 'gemini-1.5-flash';
        let apiKey = "";
        let debugMode = true;

        try {
            const paramConfig = await Parametro.findByPk('IA_CONFIG');
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
            const paramKey = await Parametro.findByPk(envVarName);
            if (paramKey) apiKey = paramKey.valor;

            const pDebug = await Parametro.findByPk('DEBUG');
            if (pDebug && pDebug.valor === 'false') debugMode = false;

        } catch (dbError) {
            console.error("Error Config IA:", dbError);
        }

        return { activeProviderKey, useModel, apiKey, debugMode };
    }

    async processWithAI(filePath, originalName, aiConfig, selectedEmpresa) {
        const interpreterFunction = aiConfig.activeProviderKey === 'openai' ? interpretQuoteOpenAI : interpretQuoteGemini;

        const interpreterConfig = {
            apiKey: aiConfig.apiKey,
            modelName: aiConfig.useModel,
            specificPromptRules: selectedEmpresa ? selectedEmpresa.prompt_reglas : null,
            debugMode: aiConfig.debugMode
        };

        console.log(`Usando IA: ${aiConfig.activeProviderKey} - Model: ${aiConfig.useModel}`);
        return await interpreterFunction(filePath, originalName, interpreterConfig);
    }

    async saveQuoteToDB(quoteData, loteId, selectedEmpresa, finalFileName) {
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
                loteId: loteId
            });
        }

        if (quoteData.comparativa_seguros && quoteData.comparativa_seguros.length > 0) {
            const detalles = quoteData.comparativa_seguros.map(c => ({
                compania: c.compania,
                plan: c.plan,
                prima_uf3: c.primas?.uf_3 ? String(c.primas.uf_3) : null,
                prima_uf5: c.primas?.uf_5 ? String(c.primas.uf_5) : null,
                prima_uf10: c.primas?.uf_10 ? String(c.primas.uf_10) : null,
                rc_monto: c.caracteristicas?.rc ? String(c.caracteristicas.rc) : null,
                taller_marca: c.caracteristicas?.taller_marca,
                observaciones: c.caracteristicas?.otros_beneficios,
                CotizacionId: nuevaCotizacion.id,
                empresa_id: selectedEmpresa ? selectedEmpresa.id : null,
                rutaArchivo: `/uploads/final/${finalFileName}`
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

        return nuevaCotizacion;
    }

    moveFileToFinal(tempPath, originalName, loteId) {
        const rootDir = getRootDir();
        const finalUploadDir = path.join(rootDir, 'uploads', 'final');
        if (!fs.existsSync(finalUploadDir)) fs.mkdirSync(finalUploadDir, { recursive: true });

        const prefix = loteId || Date.now();
        const finalFileName = `${prefix}-${originalName}`;
        const finalPath = path.join(finalUploadDir, finalFileName);

        fs.copyFileSync(tempPath, finalPath);
        return finalFileName;
    }
}

module.exports = new QuoteProcessingService();
